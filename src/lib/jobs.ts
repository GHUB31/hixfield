import crypto from "node:crypto";
import { maxConcurrency } from "@/lib/env";
import {
  activeUpstreamCount,
  getJob,
  insertJob,
  listJobRecords,
  oldestWaitingJobs,
  updateJob,
} from "@/lib/db";
import { isConcurrencyError } from "@/lib/higgsfield/client";
import type {
  JobKind,
  JobRecord,
  JobStatus,
  ProviderId,
  RouterStrategy,
  RoutingDecision,
} from "@/lib/higgsfield/types";
import { getProviderAdapter } from "@/lib/providers/registry";
import type { TaskKind } from "@/lib/providers/types";
import { selectRoute } from "@/lib/router";
import { assertBudgetAllowance, refundSpend, reserveSpend, settleSpend } from "@/lib/spend";

export { getJob };

const TERMINAL: ReadonlySet<string> = new Set(["completed", "failed", "nsfw", "canceled"]);

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const data = (err as { responseData?: unknown }).responseData;
    if (data) {
      try {
        return `${err.message} — ${JSON.stringify(data).slice(0, 400)}`;
      } catch {
        /* fall through */
      }
    }
    return err.message;
  }
  return String(err);
}

function kindToTask(kind: JobKind, route: string): TaskKind {
  if (kind === "dop") return "i2v";
  if (kind === "soul") return "t2i";
  if (kind === "character") return "character";
  if (kind === "speak") return "speak";
  if (route.includes("image-to-video") || route.includes("/dop/")) return "i2v";
  if (route.includes("text-to-video")) return "t2v";
  return "t2i";
}

function estimateFallbackUsd(provider: ProviderId, kind: JobKind, route: string): number {
  if (provider === "comfyui" || provider === "local_motion") return 0;
  if (provider === "huggingface") return kind === "dop" ? 0.05 : 0.01;
  if (route.includes("/dop/lite")) return 0.14;
  if (route.includes("/dop/turbo")) return 0.25;
  if (route.includes("/dop/standard")) return 0.45;
  if (kind === "soul" || kind === "character") return 0.12;
  if (kind === "speak") return 0.35;
  return 0.25;
}

/**
 * Create a job record (defaulting to Higgsfield for backwards compatibility with
 * existing Hixfield endpoints, or using an explicit provider/routingDecision).
 */
export async function createJob(input: {
  kind: JobKind;
  route: string;
  params: Record<string, unknown>;
  provider?: ProviderId;
  modelId?: string;
  estimatedCostUsd?: number;
  routingDecision?: RoutingDecision | null;
  campaignId?: string | null;
  sceneIndex?: number | null;
}): Promise<JobRecord> {
  const provider: ProviderId = input.provider ?? input.routingDecision?.selectedProvider ?? "higgsfield";
  const modelId = input.modelId ?? input.routingDecision?.selectedModelId ?? input.route;
  const estimatedCostUsd =
    input.estimatedCostUsd ??
    input.routingDecision?.estimatedCostUsd ??
    estimateFallbackUsd(provider, input.kind, input.route);

  // Hard server-side budget enforcement before dispatching any paid provider call
  if (estimatedCostUsd > 0) {
    assertBudgetAllowance(estimatedCostUsd);
  }

  const record: JobRecord = {
    id: crypto.randomUUID(),
    jobSetId: null,
    kind: input.kind,
    route: input.route,
    params: input.params,
    status: "waiting",
    assets: [],
    error: null,
    cost: null,
    provider,
    modelId,
    estimatedCostUsd,
    routingDecision: input.routingDecision ?? null,
    campaignId: input.campaignId ?? null,
    sceneIndex: input.sceneIndex ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  insertJob(record);
  reserveSpend({
    jobId: record.id,
    provider,
    modelId,
    estimatedUsd: estimatedCostUsd,
  });

  await trySubmit(record);
  return getJob(record.id) as JobRecord;
}

/**
 * Selects the optimal provider/model via the Model Router, checks budget, and creates/submits the job.
 */
export async function createRoutedJob(input: {
  kind: JobKind;
  task: TaskKind;
  params: Record<string, unknown>;
  strategy?: RouterStrategy;
  preferredProvider?: ProviderId;
  preferredRoute?: string;
  allowLocalFallback?: boolean;
  campaignId?: string | null;
  sceneIndex?: number | null;
}): Promise<{ job: JobRecord; decision: RoutingDecision }> {
  const decision = await selectRoute({
    task: input.task,
    strategy: input.strategy,
    preferredProvider: input.preferredProvider,
    preferredRoute: input.preferredRoute,
    allowLocalFallback: input.allowLocalFallback,
  });

  const job = await createJob({
    kind: input.kind,
    route: decision.selectedRoute,
    params: input.params,
    provider: decision.selectedProvider,
    modelId: decision.selectedModelId,
    estimatedCostUsd: decision.estimatedCostUsd,
    routingDecision: decision,
    campaignId: input.campaignId ?? null,
    sceneIndex: input.sceneIndex ?? null,
  });

  return { job, decision };
}

async function trySubmit(job: JobRecord): Promise<void> {
  const provider: ProviderId = job.provider ?? "higgsfield";
  if (provider === "higgsfield" && activeUpstreamCount("higgsfield") >= maxConcurrency()) {
    return;
  }

  const adapter = getProviderAdapter(provider);
  try {
    const res = await adapter.submit({
      jobId: job.id,
      task: kindToTask(job.kind, job.route),
      route: job.route,
      modelId: job.modelId ?? job.route,
      params: job.params,
    });

    updateJob(job.id, {
      jobSetId: res.externalId,
      status: res.status,
      ...(res.assets ? { assets: res.assets } : {}),
      ...(res.costCredits !== undefined ? { cost: res.costCredits } : {}),
      ...(res.error !== undefined ? { error: res.error } : {}),
    });

    if (res.status === "completed") {
      settleSpend(job.id, {
        actualUsd: res.actualUsd ?? job.estimatedCostUsd ?? 0,
        credits: res.costCredits ?? null,
      });
    } else if (res.status === "failed" || res.status === "nsfw" || res.status === "canceled") {
      refundSpend(job.id);
    }
  } catch (err) {
    if (provider === "higgsfield" && isConcurrencyError(err)) {
      return; // stay in local waiting queue
    }
    updateJob(job.id, { status: "failed", error: errorMessage(err) });
    refundSpend(job.id);
  }
}

/** Submit locally-queued jobs while slots are free. Poll-driven; no daemon required. */
export async function drainWaiting(): Promise<void> {
  const slots = maxConcurrency() - activeUpstreamCount("higgsfield");
  if (slots <= 0) return;
  for (const job of oldestWaitingJobs(slots, "higgsfield")) {
    await trySubmit(job);
  }
}

/**
 * Refresh a job from its owning provider adapter. Called from the client's ~2s poll.
 * On completion, ensures outputs are saved locally and reconciles the spend ledger.
 */
export async function syncJob(id: string): Promise<JobRecord | null> {
  const job = getJob(id);
  if (!job) return null;
  if (isTerminal(job.status)) return job;

  if (job.status === "waiting" || !job.jobSetId) {
    await drainWaiting();
    return getJob(id);
  }

  const provider: ProviderId = job.provider ?? "higgsfield";
  const adapter = getProviderAdapter(provider);

  try {
    const polled = await adapter.poll(job.jobSetId, job.route, job.id);
    const patch: Parameters<typeof updateJob>[1] = { status: polled.status };
    if (polled.costCredits !== undefined && polled.costCredits !== null) {
      patch.cost = polled.costCredits;
    }
    if (polled.assets && polled.assets.length > 0) {
      patch.assets = polled.assets;
      patch.error = null;
    }
    if (polled.error) {
      patch.error = polled.error;
    }

    updateJob(id, patch);

    if (polled.status === "completed") {
      settleSpend(id, {
        actualUsd: polled.actualUsd ?? job.estimatedCostUsd ?? 0,
        credits: polled.costCredits ?? null,
      });
    } else if (polled.status === "failed" || polled.status === "nsfw" || polled.status === "canceled") {
      refundSpend(id);
    }

    if (TERMINAL.has(polled.status) && provider === "higgsfield") {
      await drainWaiting();
    }
  } catch (err) {
    updateJob(id, { status: "in_progress", error: errorMessage(err) });
  }

  return getJob(id);
}

export function listJobs(opts: {
  kind?: JobKind;
  status?: JobStatus;
  provider?: ProviderId;
  campaignId?: string;
  limit?: number;
  offset?: number;
}): { jobs: JobRecord[]; total: number } {
  return listJobRecords(opts);
}
