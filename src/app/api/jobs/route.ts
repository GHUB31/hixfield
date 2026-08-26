import { NextRequest, NextResponse } from "next/server";
import { drainWaiting, listJobs } from "@/lib/jobs";
import { hasKeys } from "@/lib/env";
import { apiError } from "@/lib/api";
import type { JobKind, JobStatus } from "@/lib/higgsfield/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set(["dop", "soul", "character", "speak", "model"]);
const STATUSES = new Set([
  "waiting",
  "queued",
  "in_progress",
  "completed",
  "failed",
  "nsfw",
  "canceled",
]);

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind");
    const status = sp.get("status");
    const limit = Math.min(Number(sp.get("limit") ?? 60) || 60, 200);
    const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);

    // Every list poll is a chance to push locally-queued jobs upstream.
    if (hasKeys()) {
      try {
        await drainWaiting();
      } catch {
        /* draining is best-effort; the list itself still answers */
      }
    }

    const result = listJobs({
      kind: kind && KINDS.has(kind) ? (kind as JobKind) : undefined,
      status: status && STATUSES.has(status) ? (status as JobStatus) : undefined,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
