import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supercomputerOrchestrator } from "@/lib/agent/orchestrator";
import { apiError } from "@/lib/api";
import { listCampaigns } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    return NextResponse.json({ campaigns: listCampaigns(30) });
  } catch (err) {
    return apiError(err);
  }
}

const CreateBody = z.object({
  brandName: z.string().min(1).max(120),
  brief: z.string().min(10).max(4000),
  objective: z.string().max(400).optional(),
  targetAudience: z.string().max(400).optional(),
  platforms: z.array(z.string().min(1)).min(1).max(6).optional(),
  sceneCount: z.number().int().min(2).max(4).optional(),
  strategy: z
    .enum(["balanced", "quality", "cost", "gpu_first", "higgsfield_only", "comfyui_only"])
    .optional(),
  autoGenerateMedia: z.boolean().optional(),
  referenceImageUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateBody.parse(await req.json());
    const result = await supercomputerOrchestrator.runCampaign(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
