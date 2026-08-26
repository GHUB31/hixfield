import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getJob, syncJob } from "@/lib/jobs";
import { db } from "@/lib/db";
import { assetsDir } from "@/lib/env";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** The ~2s poll target. Syncs from upstream and downloads outputs on completion. */
export async function GET(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;
  const current = getJob(id);
  if (!current) {
    return NextResponse.json({ error: "not_found", message: "No such job." }, { status: 404 });
  }
  try {
    const job = await syncJob(id);
    return NextResponse.json({ job });
  } catch (err) {
    // Upstream hiccup: hand back the last known record so the UI keeps its state.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ job: current, warning: message });
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;
  try {
    const job = getJob(id);
    if (!job) {
      return NextResponse.json({ error: "not_found", message: "No such job." }, { status: 404 });
    }
    db().prepare("DELETE FROM jobs WHERE id = ?").run(id);
    const dir = path.join(assetsDir(), id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
