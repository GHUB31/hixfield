import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assetsDir, maxConcurrency } from "@/lib/env";
import {
  activeUpstreamCount,
  getJob,
  insertJob,
  listJobRecords,
  oldestWaitingJobs,
  updateJob,
} from "@/lib/db";
import {
  getJobSet,
  getRequestStatus,
  isConcurrencyError,
  isV2Route,
  submitGeneration,
} from "@/lib/higgsfield/client";
import type {
  AssetRef,
  JobKind,
  JobRecord,
  JobStatus,
  UpstreamJob,
} from "@/lib/higgsfield/types";

export { getJob };

const TERMINAL: ReadonlySet<string> = new Set(["completed", "failed", "nsfw", "canceled"]);

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}

function aggregateStatus(jobs: UpstreamJob[]): JobStatus {
  if (jobs.length === 0) return "queued";
  const statuses = jobs.map((j) => j.status);
  if (statuses.some((s) => s === "failed")) return "failed";
  if (statuses.some((s) => s === "nsfw")) return "nsfw";
  if (statuses.some((s) => s === "canceled")) return "canceled";
  if (statuses.every((s) => s === "completed")) return "completed";
  if (statuses.some((s) => s === "in_progress")) return "in_progress";
  return "queued";
}

/** Pull a credit figure out of the job-set payload when the API includes one. Never invented. */
function extractCost(jobSet: Record<string, unknown>): number | null {
  for (const key of ["price", "credits", "cost", "total_cost", "credits_spent"]) {
    const v = jobSet[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const data = (err as { responseData?: unknown }).responseData;
    if (data) {
      try {
        return `${err.message} — ${JSON.stringify(data).slice(0, 400)}`;
      } catch {
        /* fall through */
      }
    }
    return err.message;
  }
  return String(err);
}

/**
 * Create a job record and submit it upstream if a concurrency slot is free;
 * otherwise it waits in the local queue and drains on subsequent polls.
 */
export async function createJob(input: {
  kind: JobKind;
  route: string;
  params: Record<string, unknown>;
}): Promise<JobRecord> {
  const record: JobRecord = {
    id: crypto.randomUUID(),
    jobSetId: null,
    kind: input.kind,
    route: input.route,
    params: input.params,
    status: "waiting",
    assets: [],
    error: null,
    cost: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  insertJob(record);
  await trySubmit(record);
  return getJob(record.id) as JobRecord;
}

async function trySubmit(job: JobRecord): Promise<void> {
  if (activeUpstreamCount() >= maxConcurrency()) return;
  try {
    const jobSet = await submitGeneration(job.route, job.params);
    updateJob(job.id, {
      jobSetId: jobSet.id,
      status: aggregateStatus(jobSet.jobs),
    });
  } catch (err) {
    if (isConcurrencyError(err)) return; // stay in the local queue
    updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

/** Submit locally-queued jobs while slots are free. Poll-driven; no daemon required. */
export async function drainWaiting(): Promise<void> {
  const slots = maxConcurrency() - activeUpstreamCount();
  if (slots <= 0) return;
  for (const job of oldestWaitingJobs(slots)) {
    await trySubmit(job);
  }
}

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
};

function typeFromExt(ext: string): string {
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["wav", "mp3", "ogg"].includes(ext)) return "audio";
  return "image";
}

async function downloadAsset(jobId: string, index: number, url: string): Promise<AssetRef> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Asset download failed (${res.status}) for job ${jobId}`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const urlExt = path.extname(new URL(url).pathname).replace(".", "").toLowerCase();
  const ext = EXT_BY_MIME[mime] ?? (urlExt || "bin");
  const dir = path.join(assetsDir(), jobId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${index}.${ext}`;
  await pipeline(
    Readable.fromWeb(res.body as import("stream/web").ReadableStream),
    fs.createWriteStream(path.join(dir, filename))
  );
  return { path: `${jobId}/${filename}`, type: typeFromExt(ext), source_url: url };
}

async function downloadAssets(jobId: string, upstreamJobs: UpstreamJob[]): Promise<AssetRef[]> {
  const refs: AssetRef[] = [];
  let i = 0;
  for (const uj of upstreamJobs) {
    const url = uj.results?.raw?.url ?? uj.results?.min?.url;
    if (!url) continue;
    refs.push(await downloadAsset(jobId, i, url));
    i++;
  }
  return refs;
}

/**
 * Refresh a job from upstream. Called from the client's ~2s poll.
 * On completion, downloads every output to local disk before reporting done.
 */
export async function syncJob(id: string): Promise<JobRecord | null> {
  const job = getJob(id);
  if (!job) return null;
  if (isTerminal(job.status)) return job;

  if (job.status === "waiting" || !job.jobSetId) {
    await drainWaiting();
    return getJob(id);
  }

  // Poll by flavor: /v1/* routes use the legacy job-set endpoint; v2 direct-model
  // routes use /requests/{id}/status (normalized into the same shape upstream).
  const jobSet = isV2Route(job.route)
    ? await getRequestStatus(job.jobSetId)
    : await getJobSet(job.jobSetId);
  const status = aggregateStatus(jobSet.jobs);
  const patch: Parameters<typeof updateJob>[1] = { status };

  // v2 Request payloads carry no cost field (per the spec), so this only ever
  // records a figure for v1 job-sets that actually report one. Never invented.
  const cost = extractCost(jobSet);
  if (cost !== null) patch.cost = cost;

  if (status === "completed" && job.assets.length === 0) {
    try {
      patch.assets = await downloadAssets(job.id, jobSet.jobs);
    } catch (err) {
      // Completed upstream but not yet safely on disk — report it, keep polling.
      patch.status = "in_progress";
      patch.error = errorMessage(err);
      updateJob(id, patch);
      return getJob(id);
    }
    patch.error = null;
  }
  if (status === "failed") {
    // v2 reports an `error` string on the request — surface it verbatim when present.
    const upstreamError = typeof jobSet.error === "string" && jobSet.error ? jobSet.error : null;
    patch.error =
      upstreamError ??
      "Generation failed upstream. Credits for failed jobs are refunded automatically.";
  }
  if (status === "nsfw") {
    patch.error = "Flagged NSFW by the API. Credits are refunded automatically.";
  }

  updateJob(id, patch);
  // A finished job frees a slot — pull the next waiting one through.
  if (TERMINAL.has(status)) await drainWaiting();
  return getJob(id);
}

export function listJobs(opts: {
  kind?: JobKind;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): { jobs: JobRecord[]; total: number } {
  return listJobRecords(opts);
}
