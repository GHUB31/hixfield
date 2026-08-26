/** Statuses the Higgsfield API reports for a job. */
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

/** `waiting` is local-only: the job sits in Hixfield's queue until a concurrency slot frees up. */
export type JobStatus = "waiting" | UpstreamJobStatus;

export interface AssetRef {
  /** Path relative to the assets dir; served at /api/assets/{path}. */
  path: string;
  /** "video" | "image" | "audio" — inferred from the downloaded file. */
  type: string;
  /** The (expiring) upstream URL the file was downloaded from. */
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

/** Safe for client imports — this module holds types and constants only. */
export const TERMINAL_STATUSES = ["completed", "failed", "nsfw", "canceled"] as const;

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}
