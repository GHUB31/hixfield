import { HiggsfieldClient } from "@higgsfield/client";
import { hfKeys } from "@/lib/env";
import { Semaphore } from "./semaphore";
import type { MediaOutput, UpstreamJob, UpstreamJobSet, V2Request } from "./types";

export const HF_BASE_URL = "https://platform.higgsfield.ai";

export class MissingKeysError extends Error {
  constructor() {
    super(
      "No Higgsfield API keys configured. Set HF_API_KEY_ID and HF_API_KEY_SECRET (create a pair at cloud.higgsfield.ai)."
    );
    this.name = "MissingKeysError";
  }
}

type GlobalCache = {
  __hfClient?: HiggsfieldClient;
  __hfHttpSemaphore?: Semaphore;
};
const g = globalThis as unknown as GlobalCache;

/** Singleton official SDK client. Server-side only — keys never reach the browser. */
export function getClient(): HiggsfieldClient {
  const keys = hfKeys();
  if (!keys) throw new MissingKeysError();
  if (!g.__hfClient) {
    g.__hfClient = new HiggsfieldClient({ apiKey: keys.id, apiSecret: keys.secret });
  }
  return g.__hfClient;
}

function httpSemaphore(): Semaphore {
  if (!g.__hfHttpSemaphore) g.__hfHttpSemaphore = new Semaphore(4);
  return g.__hfHttpSemaphore;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

/** Authenticated GET against the platform API for routes the SDK doesn't expose. */
export async function hfGet<T>(pathName: string): Promise<T> {
  const keys = hfKeys();
  if (!keys) throw new MissingKeysError();
  return httpSemaphore().run(async () => {
    const res = await fetch(`${HF_BASE_URL}${pathName}`, {
      headers: {
        Authorization: `Key ${keys.id}:${keys.secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Higgsfield API ${res.status} on ${pathName}: ${await safeText(res)}`);
    }
    return (await res.json()) as T;
  });
}

/** Authenticated POST against the platform API for v2 direct-model routes. */
async function hfPost<T>(pathName: string, body: unknown): Promise<T> {
  const keys = hfKeys();
  if (!keys) throw new MissingKeysError();
  return httpSemaphore().run(async () => {
    const res = await fetch(`${HF_BASE_URL}${pathName}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${keys.id}:${keys.secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      // Body text is included so isConcurrencyError() can spot the
      // "Maximum number of concurrent requests (N) has been reached" 400.
      throw new Error(`Higgsfield API ${res.status} on ${pathName}: ${await safeText(res)}`);
    }
    return (await res.json()) as T;
  });
}

export async function getJobSet(jobSetId: string): Promise<UpstreamJobSet> {
  return hfGet<UpstreamJobSet>(`/v1/job-sets/${jobSetId}`);
}

/** Routes not under /v1/ are v2 direct-model paths (POST directly, poll /requests/{id}/status). */
export function isV2Route(route: string): boolean {
  return !route.startsWith("/v1/");
}

/**
 * Normalize a v2 Request into the v1 UpstreamJobSet shape the rest of the app
 * understands: one job per output media once outputs exist, otherwise a single
 * placeholder job carrying the request status (so aggregation works while
 * queued/in_progress and for terminal failures that produce no media).
 * The upstream `error` string rides along on the set for syncJob to surface.
 */
function normalizeV2Request(req: V2Request): UpstreamJobSet {
  const jobs: UpstreamJob[] = [];
  const push = (media: MediaOutput | null | undefined, type: string) => {
    if (!media?.url) return;
    jobs.push({
      id: `${req.request_id}:${jobs.length}`,
      status: req.status,
      results: { raw: { url: media.url, type } },
    });
  };
  for (const img of req.images ?? []) push(img, "image");
  push(req.video, "video");
  push(req.audio, "audio");
  for (const aud of req.audios ?? []) push(aud, "audio");
  if (jobs.length === 0) {
    jobs.push({ id: req.request_id, status: req.status, results: null });
  }
  return { id: req.request_id, jobs, error: req.error ?? null };
}

/** Poll a v2 request, normalized into the UpstreamJobSet shape. */
export async function getRequestStatus(requestId: string): Promise<UpstreamJobSet> {
  const req = await hfGet<V2Request>(`/requests/${requestId}/status`);
  return normalizeV2Request(req);
}

/** The API signals concurrency overflow as HTTP 400 with this phrasing — no rate-limit headers exist. */
export function isConcurrencyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /concurrent/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Submit a generation. /v1/* routes go through the official SDK (v1 job-sets);
 * everything else is a v2 direct-model POST whose response is the same Request
 * shape as the status endpoint. Retries briefly when the plan's concurrency cap
 * is hit; callers that still fail keep the job in the local `waiting` queue.
 */
export async function submitGeneration(
  route: string,
  params: Record<string, unknown>
): Promise<UpstreamJobSet> {
  let attempt = 0;
  for (;;) {
    try {
      if (isV2Route(route)) {
        const req = await hfPost<V2Request>(route, params);
        return normalizeV2Request(req);
      }
      const jobSet = await getClient().generate(route, params, { withPolling: false });
      return { id: jobSet.id, jobs: jobSet.jobs };
    } catch (err) {
      if (isConcurrencyError(err) && attempt < 3) {
        await sleep(1200 * 2 ** attempt + Math.random() * 400);
        attempt++;
        continue;
      }
      throw err;
    }
  }
}
