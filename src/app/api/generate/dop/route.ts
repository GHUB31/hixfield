import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob } from "@/lib/jobs";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tier: z.enum(["lite", "standard", "turbo"]).default("standard"),
  prompt: z.string().max(2000).default(""),
  image_url: z.string().url(),
  end_image_url: z.string().url().optional(),
  motions: z
    .array(z.object({ id: z.string().min(1), strength: z.number().min(0).max(1) }))
    .max(2)
    .default([]),
  enhance_prompt: z.boolean().optional(),
  // The spec's seed minimum is 1; 0 would 422 upstream.
  seed: z.number().int().min(1).max(1_000_000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    // v2 direct-model body per POST /higgsfield-ai/dop/{tier}: bare image_url
    // string (not the v1 input_images wrapper), optional end_image_url,
    // motions [{id, strength}] omitted when empty, enhance_prompt (spec
    // default true) passed only when the UI sent one, optional seed.
    const params: Record<string, unknown> = {
      prompt: body.prompt,
      image_url: body.image_url,
    };
    if (body.end_image_url) params.end_image_url = body.end_image_url;
    if (body.motions.length > 0) params.motions = body.motions;
    if (body.enhance_prompt !== undefined) params.enhance_prompt = body.enhance_prompt;
    if (body.seed !== undefined) params.seed = body.seed;

    const job = await createJob({ kind: "dop", route: `/higgsfield-ai/dop/${body.tier}`, params });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
