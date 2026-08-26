import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob } from "@/lib/jobs";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The 13 resolutions the UI offers (the historic Soul size list). The UI contract is frozen. */
const SOUL_SIZES = [
  "2048x1152",
  "2048x1536",
  "2016x1344",
  "1696x960",
  "1632x1088",
  "1152x2048",
  "1536x2048",
  "1344x2016",
  "960x1696",
  "1088x1632",
  "1536x1536",
  "1536x1152",
  "1152x1536",
] as const;

const Body = z.object({
  prompt: z.string().min(1).max(2000),
  width_and_height: z.enum(SOUL_SIZES).default("1536x2048"),
  quality: z.enum(["720p", "1080p"]).default("1080p"),
  batch_size: z.union([z.literal(1), z.literal(4)]).default(1),
  style_id: z.string().optional(),
  style_strength: z.number().min(0).max(1).optional(),
  custom_reference_id: z.string().optional(),
  custom_reference_strength: z.number().min(0).max(1).optional(),
  // The spec's seed minimum is 1; 0 would 422 upstream.
  seed: z.number().int().min(1).max(1_000_000).optional(),
  enhance_prompt: z.boolean().optional(),
});

/** aspect_ratio enum on POST /higgsfield-ai/soul/character (and /soul/reference). */
const CHARACTER_RATIOS = ["9:16", "16:9", "4:3", "3:4", "1:1", "2:3", "3:2"] as const;
/** aspect_ratio enum on POST /higgsfield-ai/soul/standard. */
const STANDARD_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "16:9",
  "9:16",
  "21:9",
] as const;

/** Pick the enum aspect ratio nearest (in log space) to the UI's pixel size. */
function nearestAspectRatio(widthAndHeight: string, allowed: readonly string[]): string {
  const [w, h] = widthAndHeight.split("x").map(Number);
  const target = Math.log(w / h);
  let best = allowed[0];
  let bestDist = Infinity;
  for (const ratio of allowed) {
    const [rw, rh] = ratio.split(":").map(Number);
    const dist = Math.abs(Math.log(rw / rh) - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = ratio;
    }
  }
  return best;
}

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());

    if (body.custom_reference_id) {
      // Character generation -> POST /higgsfield-ai/soul/character.
      // Its resolution enum is 720p/1080p — the UI's quality values verbatim.
      const params: Record<string, unknown> = {
        prompt: body.prompt,
        custom_reference_id: body.custom_reference_id,
        custom_reference_strength: body.custom_reference_strength ?? 1,
        batch_size: body.batch_size,
        resolution: body.quality,
        aspect_ratio: nearestAspectRatio(body.width_and_height, CHARACTER_RATIOS),
      };
      if (body.style_id) {
        params.style_id = body.style_id;
        params.style_strength = body.style_strength ?? 1;
      }
      if (body.seed !== undefined) params.seed = body.seed;
      if (body.enhance_prompt !== undefined) params.enhance_prompt = body.enhance_prompt;

      const job = await createJob({
        kind: "character",
        route: "/higgsfield-ai/soul/character",
        params,
      });
      return NextResponse.json({ job }, { status: 201 });
    }

    // No custom reference -> POST /higgsfield-ai/soul/standard, whose schema
    // accepts ONLY prompt/num_images/resolution/aspect_ratio.
    //
    // Dropped (the schema rejects them, and /soul/reference — the only other
    // style-capable route — requires an image_reference_url the UI never
    // sends): style_id, style_strength, seed, enhance_prompt.
    //
    // Resolution: standard's enum is 2K/4K, the UI's quality is 720p/1080p.
    // Every UI size tops out at 2048px (the 2K class), and both 720p and
    // 1080p sit at or below it, so both map to "2K" — the nearest honest
    // value and the spec default. Claiming "4K" for a 1080p request would
    // overstate what was asked for (and what it costs), so we never send it;
    // the 720p/1080p distinction is honored only on the character route,
    // where those values exist natively.
    const params: Record<string, unknown> = {
      prompt: body.prompt,
      num_images: body.batch_size,
      resolution: "2K",
      aspect_ratio: nearestAspectRatio(body.width_and_height, STANDARD_RATIOS),
    };

    const job = await createJob({
      kind: "soul",
      route: "/higgsfield-ai/soul/standard",
      params,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
