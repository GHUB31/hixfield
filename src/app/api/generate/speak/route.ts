import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob } from "@/lib/jobs";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  input_image_url: z.string().url(),
  input_audio_url: z.string().url(),
  prompt: z.string().max(2000).default(""),
  quality: z.enum(["mid", "high"]).default("mid"),
  duration: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const params = {
      input_image: { type: "image_url", image_url: body.input_image_url },
      input_audio: { type: "audio_url", audio_url: body.input_audio_url },
      prompt: body.prompt,
      quality: body.quality,
      duration: body.duration,
    };
    const job = await createJob({ kind: "speak", route: "/v1/speak/higgsfield", params });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
