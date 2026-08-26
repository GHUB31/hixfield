import { NextRequest, NextResponse } from "next/server";
import { createJob, getJob } from "@/lib/jobs";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Clone a past job's exact parameters into a fresh submission. */
export async function POST(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;
  try {
    const source = getJob(id);
    if (!source) {
      return NextResponse.json({ error: "not_found", message: "No such job." }, { status: 404 });
    }
    const job = await createJob({
      kind: source.kind,
      route: source.route,
      params: source.params,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
