import crypto from "node:crypto";
import {
  insertSpendEntry,
  listSpendEntries,
  readBudgetSettings,
  sumSpendByProvider,
  sumSpendSince,
  updateSpendByJobId,
  writeBudgetSettings,
} from "@/lib/db";
import type { BudgetSettings, ProviderId, SpendLedgerEntry } from "@/lib/higgsfield/types";

export class BudgetExceededError extends Error {
  readonly statusCode = 402;
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export interface SpendSummary {
  dailySpentUsd: number;
  monthlySpentUsd: number;
  dailyRemainingUsd: number;
  monthlyRemainingUsd: number;
  settings: BudgetSettings;
  byProvider: Record<string, { usd: number; credits: number; count: number }>;
  recent: SpendLedgerEntry[];
}

function startOfUtcDayMs(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfUtcMonthMs(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function getSpendSummary(limit = 40): SpendSummary {
  const settings = readBudgetSettings();
  const dailySpentUsd = roundUsd(sumSpendSince(startOfUtcDayMs()));
  const monthlySpentUsd = roundUsd(sumSpendSince(startOfUtcMonthMs()));
  return {
    dailySpentUsd,
    monthlySpentUsd,
    dailyRemainingUsd: roundUsd(Math.max(0, settings.dailyBudgetUsd - dailySpentUsd)),
    monthlyRemainingUsd: roundUsd(Math.max(0, settings.monthlyBudgetUsd - monthlySpentUsd)),
    settings,
    byProvider: sumSpendByProvider(),
    recent: listSpendEntries(limit),
  };
}

export function roundUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function canAffordEstimatedSpend(estimatedUsd: number): {
  allowed: boolean;
  reason?: string;
} {
  if (estimatedUsd <= 0) return { allowed: true };
  const summary = getSpendSummary(0);
  if (summary.dailySpentUsd + estimatedUsd > summary.settings.dailyBudgetUsd) {
    return {
      allowed: false,
      reason: `Estimated $${estimatedUsd.toFixed(3)} exceeds daily cap ($${summary.dailySpentUsd.toFixed(2)} / $${summary.settings.dailyBudgetUsd.toFixed(2)})`,
    };
  }
  if (summary.monthlySpentUsd + estimatedUsd > summary.settings.monthlyBudgetUsd) {
    return {
      allowed: false,
      reason: `Estimated $${estimatedUsd.toFixed(3)} exceeds monthly cap ($${summary.monthlySpentUsd.toFixed(2)} / $${summary.settings.monthlyBudgetUsd.toFixed(2)})`,
    };
  }
  return { allowed: true };
}

export function assertBudgetAllowance(estimatedUsd: number): void {
  const check = canAffordEstimatedSpend(estimatedUsd);
  if (!check.allowed) {
    throw new BudgetExceededError(check.reason ?? "Spend limit reached.");
  }
}

export function reserveSpend(input: {
  jobId: string;
  provider: ProviderId;
  modelId: string;
  estimatedUsd: number;
}): SpendLedgerEntry {
  const now = Date.now();
  const entry: SpendLedgerEntry = {
    id: crypto.randomUUID(),
    jobId: input.jobId,
    provider: input.provider,
    modelId: input.modelId,
    estimatedUsd: roundUsd(input.estimatedUsd),
    actualUsd: null,
    credits: null,
    status: "reserved",
    createdAt: now,
    updatedAt: now,
  };
  insertSpendEntry(entry);
  return entry;
}

export function settleSpend(jobId: string, opts?: { actualUsd?: number | null; credits?: number | null }): void {
  updateSpendByJobId(jobId, {
    status: "settled",
    ...(opts?.actualUsd !== undefined ? { actualUsd: opts.actualUsd } : {}),
    ...(opts?.credits !== undefined ? { credits: opts.credits } : {}),
  });
}

export function refundSpend(jobId: string): void {
  updateSpendByJobId(jobId, { status: "refunded", actualUsd: 0 });
}

export function getBudgetSettings(): BudgetSettings {
  return readBudgetSettings();
}

export function updateBudgetSettings(
  patch: Partial<Omit<BudgetSettings, "updatedAt">>
): BudgetSettings {
  return writeBudgetSettings(patch);
}
