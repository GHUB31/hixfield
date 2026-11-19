import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { secretPresenceSummary } from "@/lib/env";
import { supercomputerAgentAdapter } from "@/lib/providers/higgsfield-agent";
import { checkAllProvidersHealth } from "@/lib/providers/registry";
import { ROUTER_CATALOG, selectRoute } from "@/lib/router";
import { getSpendSummary, updateBudgetSettings } from "@/lib/spend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const providers = await checkAllProvidersHealth(force);
    const spend = getSpendSummary(50);
    return NextResponse.json({
      providers,
      secrets: secretPresenceSummary(),
      catalog: ROUTER_CATALOG,
      spend,
    });
  } catch (err) {
    return apiError(err);
  }
}

const PatchSettings = z.object({
  dailyBudgetUsd: z.number().min(0).max(100_000).optional(),
  monthlyBudgetUsd: z.number().min(0).max(1_000_000).optional(),
  routerStrategy: z
    .enum(["balanced", "quality", "cost", "gpu_first", "higgsfield_only", "comfyui_only"])
    .optional(),
  supercomputerMode: z.enum(["auto", "official", "local"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = PatchSettings.parse(await req.json());
    const settings = updateBudgetSettings(body);
    return NextResponse.json({ settings });
  } catch (err) {
    return apiError(err);
  }
}

const SimulateBody = z.object({
  task: z.enum(["i2v", "t2i", "t2v", "character", "speak"]),
  strategy: z
    .enum(["balanced", "quality", "cost", "gpu_first", "higgsfield_only", "comfyui_only"])
    .optional(),
  preferredProvider: z.enum(["higgsfield", "comfyui", "huggingface", "local_motion"]).optional(),
  maxCostUsd: z.number().min(0).optional(),
  probeSupercomputer: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = SimulateBody.parse(await req.json());
    const decision = await selectRoute({
      task: body.task,
      strategy: body.strategy,
      preferredProvider: body.preferredProvider,
      maxCostUsd: body.maxCostUsd,
    });
    const supercomputer = body.probeSupercomputer
      ? await supercomputerAgentAdapter.probeAccess()
      : undefined;
    return NextResponse.json({ decision, ...(supercomputer ? { supercomputer } : {}) });
  } catch (err) {
    return apiError(err);
  }
}
