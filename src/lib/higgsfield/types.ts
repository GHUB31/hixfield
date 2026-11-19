/** Statuses the Higgsfield API and Vyolab provider adapters report for a job. */
export type UpstreamJobStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw"
  | "canceled";

export interface UpstreamJobResult {
  url: string;
  type: string;
}

export interface UpstreamJob {
  id: string;
  status: string;
  results?: { raw?: UpstreamJobResult | null; min?: UpstreamJobResult | null } | null;
}

export interface UpstreamJobSet {
  id: string;
  jobs: UpstreamJob[];
  [key: string]: unknown;
}

/**
 * v2 API media output (spec `MediaOutput`): exactly one field, `url`
 * (`additionalProperties: false` — no type/mime is reported; the media kind
 * is known from which Request field the output arrived in).
 */
export interface MediaOutput {
  url: string;
}

/**
 * v2 API `Request` shape — returned both by direct-model POSTs
 * (e.g. /higgsfield-ai/dop/standard) and by GET /requests/{id}/status.
 */
export interface V2Request {
  status: UpstreamJobStatus;
  request_id: string;
  status_url?: string;
  cancel_url?: string;
  error?: string | null;
  images?: MediaOutput[];
  video?: MediaOutput;
  audio?: MediaOutput;
  audios?: MediaOutput[];
}

export type JobKind = "dop" | "soul" | "character" | "speak" | "model";

export type ProviderId = "higgsfield" | "comfyui" | "huggingface" | "local_motion";

export type RouterStrategy =
  | "balanced"
  | "quality"
  | "cost"
  | "gpu_first"
  | "higgsfield_only"
  | "comfyui_only";

export interface RoutingCandidateAudit {
  provider: ProviderId;
  modelId: string;
  label: string;
  available: boolean;
  reason?: string;
  qualityScore: number;
  estimatedCostUsd: number;
  compositeScore: number;
}

export interface RoutingDecision {
  task: "i2v" | "t2i" | "t2v" | "character" | "speak";
  strategy: RouterStrategy;
  selectedProvider: ProviderId;
  selectedModelId: string;
  selectedRoute: string;
  estimatedCostUsd: number;
  qualityScore: number;
  reason: string;
  candidates: RoutingCandidateAudit[];
  decidedAt: number;
}

/** `waiting` is local-only: the job sits in Vyolab's queue until a concurrency slot frees up. */
export type JobStatus = "waiting" | UpstreamJobStatus;

export interface AssetRef {
  /** Path relative to the assets dir; served at /api/assets/{path}. */
  path: string;
  /** "video" | "image" | "audio" — inferred from the downloaded file. */
  type: string;
  /** The (expiring) upstream URL or provider URI the file was downloaded from. */
  source_url: string;
}

export interface JobRecord {
  id: string;
  jobSetId: string | null;
  kind: JobKind;
  route: string;
  params: Record<string, unknown>;
  status: JobStatus;
  assets: AssetRef[];
  error: string | null;
  /** Credits as reported by the API, when it reports them. Never invented. */
  cost: number | null;
  /** Vyolab multi-provider & spend fields */
  provider?: ProviderId;
  modelId?: string | null;
  estimatedCostUsd?: number | null;
  routingDecision?: RoutingDecision | null;
  campaignId?: string | null;
  sceneIndex?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Motion {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
  start_end_frame?: boolean;
}

export interface SoulStyle {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
}

export interface CharacterRecord {
  id: string;
  name: string;
  status: string;
}

export interface SpendLedgerEntry {
  id: string;
  jobId: string;
  provider: ProviderId;
  modelId: string;
  estimatedUsd: number;
  actualUsd: number | null;
  credits: number | null;
  status: "reserved" | "settled" | "refunded";
  createdAt: number;
  updatedAt: number;
}

export interface BudgetSettings {
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  routerStrategy: RouterStrategy;
  supercomputerMode: "auto" | "official" | "local";
  updatedAt: number;
}

export interface CampaignScene {
  index: number;
  title: string;
  durationSec: number;
  narration: string;
  visualPrompt: string;
  motionPrompt: string;
  cameraMove: string;
  lighting: string;
  imageJobId?: string | null;
  imageAssetPath?: string | null;
  videoJobId?: string | null;
  videoAssetPath?: string | null;
  status: "planned" | "generating_image" | "generating_video" | "completed" | "failed";
  error?: string | null;
}

export interface CampaignCaption {
  platform: string;
  headline: string;
  caption: string;
  hashtags: string[];
  cta: string;
  recommendedSlotIso: string;
}

export interface CampaignTraceEvent {
  at: number;
  stage: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface CampaignRecord {
  id: string;
  brandName: string;
  brief: string;
  objective: string;
  targetAudience: string;
  platforms: string[];
  skillIds: string[];
  engine: "higgsfield_supercomputer" | "vyolab_orchestrator";
  engineReason: string;
  upstreamSessionId: string | null;
  status: "draft" | "running" | "completed" | "failed" | "awaiting_input";
  script: {
    hook: string;
    concept: string;
    characterBible: string;
    visualStyle: string;
    cta: string;
    totalDurationSec: number;
  } | null;
  storyboard: CampaignScene[];
  captions: CampaignCaption[];
  trace: CampaignTraceEvent[];
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ApprovalStatus = "pending_approval" | "approved" | "rejected";
export type PublishStatus = "draft" | "scheduled" | "published" | "failed";

export interface PublishQueueRecord {
  id: string;
  campaignId: string | null;
  jobId: string | null;
  platform: string;
  integrationId: string | null;
  caption: string;
  hashtags: string[];
  mediaPaths: string[];
  scheduledAt: string | null;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: number | null;
  rejectionReason: string | null;
  postizPostId: string | null;
  publishStatus: PublishStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Safe for client imports — this module holds types and constants only. */
export const TERMINAL_STATUSES = ["completed", "failed", "nsfw", "canceled"] as const;

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}
