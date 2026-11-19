import type { AssetRef, ProviderId, UpstreamJobStatus } from "@/lib/higgsfield/types";

export type TaskKind = "i2v" | "t2i" | "t2v" | "character" | "speak";

export interface ProviderHealth {
  provider: ProviderId;
  name: string;
  configured: boolean;
  available: boolean;
  latencyMs: number | null;
  detail: string;
  checkedAt: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderSubmitInput {
  jobId: string;
  task: TaskKind;
  route: string;
  modelId: string;
  params: Record<string, unknown>;
}

export interface ProviderSubmitResult {
  externalId: string;
  status: UpstreamJobStatus;
  /** Adapters that finish synchronously (e.g. HF Inference / Local Motion) return local AssetRefs immediately. */
  assets?: AssetRef[];
  costCredits?: number | null;
  actualUsd?: number | null;
  error?: string | null;
}

export interface ProviderPollResult {
  status: UpstreamJobStatus;
  assets?: AssetRef[];
  costCredits?: number | null;
  actualUsd?: number | null;
  error?: string | null;
}

export interface CreativeProviderAdapter {
  readonly id: ProviderId;
  readonly name: string;
  readonly supportsTasks: readonly TaskKind[];
  healthCheck(): Promise<ProviderHealth>;
  submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult>;
  poll(externalId: string, route: string, jobId: string): Promise<ProviderPollResult>;
}
