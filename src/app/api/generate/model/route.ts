import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob } from "@/lib/jobs";
import { getModel } from "@/lib/models";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  model_id: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const model = getModel(body.model_id);
    if (!model) {
      return NextResponse.json(
        { error: "bad_request", message: `Unknown model "${body.model_id}". Routes live in src/data/models.json.` },
        { status: 400 }
      );
    }
    // Only fields the model declares reach the API — nothing smuggled.
    const allowed = new Set(model.fields.map((f) => f.name));
    const params: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body.params)) {
      if (allowed.has(key) && value !== undefined && value !== null && value !== "") {
        params[key] = value;
      }
    }
    const job = await createJob({ kind: "model", route: model.endpoint, params });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET() {
  const { listModels } = await import("@/lib/models");
  return NextResponse.json({ models: listModels() });
}
