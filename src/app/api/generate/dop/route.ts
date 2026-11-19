import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { createJob, createRoutedJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ImageUrlSchema = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith("https://") || v.startsWith("http://") || v.startsWith("/api/assets/") || v.startsWith("/media/"),
    "Must be an http(s) URL or a local /api/assets/ or /media/ path"
  );

const Body = z.object({
  tier: z.enum(["lite", "standard", "turbo"]).default("standard"),
  prompt: z.string().max(2000).default(""),
  image_url: ImageUrlSchema,
  end_image_url: ImageUrlSchema.optional(),
  motions: z
    .array(z.object({ id: z.string().min(1), strength: z.number().min(0).max(1) }))
    .max(2)
    .default([]),
  enhance_prompt: z.boolean().optional(),
  seed: z.number().int().min(1).max(1_000_000).optional(),
  duration: z.number().min(2).max(10).optional(),
  /** Optional Vyolab Model Router controls (default: router auto-selects best available I2V route) */
  provider: z.enum(["auto", "higgsfield", "comfyui", "huggingface", "local_motion"]).default("auto"),
  strategy: z
    .enum(["balanced", "quality", "cost", "gpu_first", "higgsfield_only", "comfyui_only"])
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const params: Record<string, unknown> = {
      prompt: body.prompt,
      image_url: body.image_url,
    };
    if (body.end_image_url) params.end_image_url = body.end_image_url;
    if (body.motions.length > 0) params.motions = body.motions;
    if (body.enhance_prompt !== undefined) params.enhance_prompt = body.enhance_prompt;
    if (body.seed !== undefined) params.seed = body.seed;
    if (body.duration !== undefined) params.duration = body.duration;

    const preferredRoute = `/higgsfield-ai/dop/${body.tier}`;

    // Explicit direct Higgsfield request preserves exact Hixfield v2 DoP behavior
    if (body.provider === "higgsfield") {
      const job = await createJob({
        kind: "dop",
        route: preferredRoute,
        provider: "higgsfield",
        modelId: `higgsfield/dop-${body.tier}`,
        params,
      });
      return NextResponse.json({ job }, { status: 201 });
    }

    const { job, decision } = await createRoutedJob({
      kind: "dop",
      task: "i2v",
      params,
      strategy: body.strategy,
      preferredProvider: body.provider === "auto" ? undefined : body.provider,
      preferredRoute,
    });
    return NextResponse.json({ job, routingDecision: decision }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
