import { NextResponse } from "next/server";
import { hasKeys, secretPresenceSummary } from "@/lib/env";
import { postizAdapter } from "@/lib/providers/postiz";
import { checkAllProvidersHealth } from "@/lib/providers/registry";
import { listHiggsfieldSkills } from "@/lib/skills";
import { getSpendSummary } from "@/lib/spend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [providers, postiz] = await Promise.all([
    checkAllProvidersHealth(),
    postizAdapter.healthCheck(),
  ]);
  const spend = getSpendSummary(5);
  const skills = listHiggsfieldSkills();

  return NextResponse.json({
    ok: true,
    platform: "Vyolab Studio",
    hasKeys: hasKeys(),
    secrets: secretPresenceSummary(),
    providers,
    postiz,
    spend: {
      dailySpentUsd: spend.dailySpentUsd,
      monthlySpentUsd: spend.monthlySpentUsd,
      dailyBudgetUsd: spend.settings.dailyBudgetUsd,
      monthlyBudgetUsd: spend.settings.monthlyBudgetUsd,
      routerStrategy: spend.settings.routerStrategy,
      supercomputerMode: spend.settings.supercomputerMode,
    },
    skillsCount: skills.length,
  });
}
