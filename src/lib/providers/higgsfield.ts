import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assetsDir, hfKeys } from "@/lib/env";
import {
  getJobSet,
  getRequestStatus,
  isV2Route,
  submitGeneration,
} from "@/lib/higgsfield/client";
import type { AssetRef, UpstreamJob, UpstreamJobStatus } from "@/lib/higgsfield/types";
import type {
  CreativeProviderAdapter,
  ProviderHealth,
  ProviderPollResult,
  ProviderSubmitInput,
  ProviderSubmitResult,
} from "./types";

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

function aggregateStatus(jobs: UpstreamJob[]): UpstreamJobStatus {
  if (jobs.length === 0) return "queued";
  const statuses = jobs.map((j) => j.status);
  if (statuses.some((s) => s === "failed")) return "failed";
  if (statuses.some((s) => s === "nsfw")) return "nsfw";
  if (statuses.some((s) => s === "canceled")) return "canceled";
  if (statuses.every((s) => s === "completed")) return "completed";
  if (statuses.some((s) => s === "in_progress")) return "in_progress";
  return "queued";
}

function extractCost(jobSet: Record<string, unknown>): number | null {
  for (const key of ["price", "credits", "cost", "total_cost", "credits_spent"]) {
    const v = jobSet[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export async function downloadRemoteAsset(
  jobId: string,
  index: number,
  url: string,
  headers?: Record<string, string>
): Promise<AssetRef> {
  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new Error(`Asset download failed (${res.status}) for job ${jobId}`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  let urlExt = "";
  try {
    urlExt = path.extname(new URL(url).pathname).replace(".", "").toLowerCase();
  } catch {
    urlExt = "";
  }
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

export class HiggsfieldProviderAdapter implements CreativeProviderAdapter {
  readonly id = "higgsfield" as const;
  readonly name = "Higgsfield Official API";
  readonly supportsTasks = ["i2v", "t2i", "t2v", "character", "speak"] as const;

  async healthCheck(): Promise<ProviderHealth> {
    const keys = hfKeys();
    const now = Date.now();
    if (!keys) {
      return {
        provider: this.id,
        name: this.name,
        configured: false,
        available: false,
        latencyMs: null,
        detail: "Set HF_API_KEY_ID and HF_API_KEY_SECRET (or HF_KEY) server-side.",
        checkedAt: now,
      };
    }
    return {
      provider: this.id,
      name: this.name,
      configured: true,
      available: true,
      latencyMs: 0,
      detail: "Server-side key pair configured (platform.higgsfield.ai).",
      checkedAt: now,
    };
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    const jobSet = await submitGeneration(input.route, input.params);
    return {
      externalId: jobSet.id,
      status: aggregateStatus(jobSet.jobs),
      costCredits: extractCost(jobSet),
    };
  }

  async poll(externalId: string, route: string, jobId: string): Promise<ProviderPollResult> {
    const jobSet = isV2Route(route)
      ? await getRequestStatus(externalId)
      : await getJobSet(externalId);
    const status = aggregateStatus(jobSet.jobs);
    const costCredits = extractCost(jobSet);

    if (status === "completed") {
      const assets: AssetRef[] = [];
      let i = 0;
      for (const uj of jobSet.jobs) {
        const url = uj.results?.raw?.url ?? uj.results?.min?.url;
        if (!url) continue;
        assets.push(await downloadRemoteAsset(jobId, i, url));
        i++;
      }
      return { status, assets, costCredits };
    }

    if (status === "failed") {
      const upstreamError = typeof jobSet.error === "string" && jobSet.error ? jobSet.error : null;
      return {
        status,
        costCredits,
        error:
          upstreamError ??
          "Generation failed upstream. Credits for failed jobs are refunded automatically.",
      };
    }

    if (status === "nsfw") {
      return {
        status,
        costCredits,
        error: "Flagged NSFW by the API. Credits are refunded automatically.",
      };
    }

    return { status, costCredits };
  }
}

export const higgsfieldAdapter = new HiggsfieldProviderAdapter();
