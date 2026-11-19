import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  dataDir,
  defaultDailyBudgetUsd,
  defaultMonthlyBudgetUsd,
  defaultSupercomputerMode,
} from "@/lib/env";
import type {
  ApprovalStatus,
  AssetRef,
  BudgetSettings,
  CampaignCaption,
  CampaignRecord,
  CampaignScene,
  CampaignTraceEvent,
  JobKind,
  JobRecord,
  JobStatus,
  ProviderId,
  PublishQueueRecord,
  PublishStatus,
  RouterStrategy,
  RoutingDecision,
  SpendLedgerEntry,
} from "@/lib/higgsfield/types";

const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  job_set_id TEXT,
  kind TEXT NOT NULL,
  route TEXT NOT NULL,
  params TEXT NOT NULL,
  status TEXT NOT NULL,
  assets TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  cost REAL,
  provider TEXT NOT NULL DEFAULT 'higgsfield',
  model_id TEXT,
  estimated_cost_usd REAL,
  routing_decision TEXT,
  campaign_id TEXT,
  scene_index INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_kind ON jobs(kind);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS spend_ledger (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  estimated_usd REAL NOT NULL DEFAULT 0,
  actual_usd REAL,
  credits REAL,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spend_created ON spend_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spend_job ON spend_ledger(job_id);

CREATE TABLE IF NOT EXISTS budget_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL,
  monthly_budget_usd REAL NOT NULL,
  router_strategy TEXT NOT NULL DEFAULT 'balanced',
  supercomputer_mode TEXT NOT NULL DEFAULT 'auto',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  brand_name TEXT NOT NULL,
  brief TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '[]',
  skill_ids TEXT NOT NULL DEFAULT '[]',
  engine TEXT NOT NULL DEFAULT 'vyolab_orchestrator',
  engine_reason TEXT NOT NULL DEFAULT '',
  upstream_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  script TEXT,
  storyboard TEXT NOT NULL DEFAULT '[]',
  captions TEXT NOT NULL DEFAULT '[]',
  trace TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS publish_queue (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  job_id TEXT,
  platform TEXT NOT NULL,
  integration_id TEXT,
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL DEFAULT '[]',
  media_paths TEXT NOT NULL DEFAULT '[]',
  scheduled_at TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending_approval',
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,
  postiz_post_id TEXT,
  publish_status TEXT NOT NULL DEFAULT 'draft',
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_publish_created ON publish_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_approval ON publish_queue(approval_status);
`;

type GlobalCache = { __hixdb?: Database.Database; __hixdbPath?: string };
const g = globalThis as unknown as GlobalCache;

function migrateJobsTable(d: Database.Database): void {
  const cols = new Set(
    (d.prepare("PRAGMA table_info(jobs)").all() as Array<{ name: string }>).map((c) => c.name)
  );
  const additions: Array<[string, string]> = [
    ["provider", "TEXT NOT NULL DEFAULT 'higgsfield'"],
    ["model_id", "TEXT"],
    ["estimated_cost_usd", "REAL"],
    ["routing_decision", "TEXT"],
    ["campaign_id", "TEXT"],
    ["scene_index", "INTEGER"],
  ];
  for (const [col, def] of additions) {
    if (!cols.has(col)) {
      d.exec(`ALTER TABLE jobs ADD COLUMN ${col} ${def}`);
    }
  }
}

export function db(): Database.Database {
  const dbPath = path.join(dataDir(), "hixfield.db");
  if (g.__hixdb && g.__hixdbPath !== dbPath) {
    try {
      g.__hixdb.close();
    } catch {
      /* ignore */
    }
    g.__hixdb = undefined;
  }
  if (!g.__hixdb) {
    fs.mkdirSync(dataDir(), { recursive: true });
    const d = new Database(dbPath);
    d.pragma("journal_mode = WAL");
    d.exec(BASE_SCHEMA);
    migrateJobsTable(d);
    d.prepare(
      `INSERT OR IGNORE INTO budget_settings (id, daily_budget_usd, monthly_budget_usd, router_strategy, supercomputer_mode, updated_at)
       VALUES (1, ?, ?, 'balanced', ?, ?)`
    ).run(defaultDailyBudgetUsd(), defaultMonthlyBudgetUsd(), defaultSupercomputerMode(), Date.now());
    g.__hixdb = d;
    g.__hixdbPath = dbPath;
  }
  return g.__hixdb;
}

export function closeDb(): void {
  if (g.__hixdb) {
    try {
      g.__hixdb.close();
    } catch {
      /* ignore */
    }
    g.__hixdb = undefined;
    g.__hixdbPath = undefined;
  }
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  job_set_id: string | null;
  kind: string;
  route: string;
  params: string;
  status: string;
  assets: string;
  error: string | null;
  cost: number | null;
  provider?: string | null;
  model_id?: string | null;
  estimated_cost_usd?: number | null;
  routing_decision?: string | null;
  campaign_id?: string | null;
  scene_index?: number | null;
  created_at: number;
  updated_at: number;
}

export function rowToJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    jobSetId: row.job_set_id,
    kind: row.kind as JobKind,
    route: row.route,
    params: parseJson<Record<string, unknown>>(row.params, {}),
    status: row.status as JobStatus,
    assets: parseJson<AssetRef[]>(row.assets, []),
    error: row.error,
    cost: row.cost,
    provider: (row.provider as ProviderId) ?? "higgsfield",
    modelId: row.model_id ?? null,
    estimatedCostUsd: row.estimated_cost_usd ?? null,
    routingDecision: parseJson<RoutingDecision | null>(row.routing_decision, null),
    campaignId: row.campaign_id ?? null,
    sceneIndex: row.scene_index ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getJob(id: string): JobRecord | null {
  const row = db().prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function insertJob(job: JobRecord): void {
  db()
    .prepare(
      `INSERT INTO jobs (
        id, job_set_id, kind, route, params, status, assets, error, cost,
        provider, model_id, estimated_cost_usd, routing_decision, campaign_id, scene_index,
        created_at, updated_at
      ) VALUES (
        @id, @job_set_id, @kind, @route, @params, @status, @assets, @error, @cost,
        @provider, @model_id, @estimated_cost_usd, @routing_decision, @campaign_id, @scene_index,
        @created_at, @updated_at
      )`
    )
    .run({
      id: job.id,
      job_set_id: job.jobSetId,
      kind: job.kind,
      route: job.route,
      params: JSON.stringify(job.params),
      status: job.status,
      assets: JSON.stringify(job.assets),
      error: job.error,
      cost: job.cost,
      provider: job.provider ?? "higgsfield",
      model_id: job.modelId ?? null,
      estimated_cost_usd: job.estimatedCostUsd ?? null,
      routing_decision: job.routingDecision ? JSON.stringify(job.routingDecision) : null,
      campaign_id: job.campaignId ?? null,
      scene_index: job.sceneIndex ?? null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    });
}

export function updateJob(
  id: string,
  patch: Partial<
    Pick<JobRecord, "jobSetId" | "status" | "assets" | "error" | "cost" | "provider" | "modelId">
  >
): void {
  const sets: string[] = ["updated_at = @updated_at"];
  const args: Record<string, unknown> = { id, updated_at: Date.now() };
  if (patch.jobSetId !== undefined) {
    sets.push("job_set_id = @job_set_id");
    args.job_set_id = patch.jobSetId;
  }
  if (patch.status !== undefined) {
    sets.push("status = @status");
    args.status = patch.status;
  }
  if (patch.assets !== undefined) {
    sets.push("assets = @assets");
    args.assets = JSON.stringify(patch.assets);
  }
  if (patch.error !== undefined) {
    sets.push("error = @error");
    args.error = patch.error;
  }
  if (patch.cost !== undefined) {
    sets.push("cost = @cost");
    args.cost = patch.cost;
  }
  if (patch.provider !== undefined) {
    sets.push("provider = @provider");
    args.provider = patch.provider;
  }
  if (patch.modelId !== undefined) {
    sets.push("model_id = @model_id");
    args.model_id = patch.modelId;
  }
  db().prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = @id`).run(args);
}

export function listJobRecords(opts: {
  kind?: JobKind;
  status?: JobStatus;
  provider?: ProviderId;
  campaignId?: string;
  limit?: number;
  offset?: number;
}): { jobs: JobRecord[]; total: number } {
  const where: string[] = [];
  const args: Record<string, unknown> = {};
  if (opts.kind) {
    where.push("kind = @kind");
    args.kind = opts.kind;
  }
  if (opts.status) {
    where.push("status = @status");
    args.status = opts.status;
  }
  if (opts.provider) {
    where.push("provider = @provider");
    args.provider = opts.provider;
  }
  if (opts.campaignId) {
    where.push("campaign_id = @campaign_id");
    args.campaign_id = opts.campaignId;
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db().prepare(`SELECT COUNT(*) AS n FROM jobs ${clause}`).get(args) as { n: number }
  ).n;
  const rows = db()
    .prepare(`SELECT * FROM jobs ${clause} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...args, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }) as JobRow[];
  return { jobs: rows.map(rowToJob), total };
}

/** Jobs currently occupying a Higgsfield upstream concurrency slot. */
export function activeUpstreamCount(provider: ProviderId = "higgsfield"): number {
  const row = db()
    .prepare(
      "SELECT COUNT(*) AS n FROM jobs WHERE provider = ? AND job_set_id IS NOT NULL AND status IN ('queued','in_progress')"
    )
    .get(provider) as { n: number };
  return row.n;
}

export function oldestWaitingJobs(limit: number, provider?: ProviderId): JobRecord[] {
  const rows = provider
    ? (db()
        .prepare("SELECT * FROM jobs WHERE status = 'waiting' AND provider = ? ORDER BY created_at ASC LIMIT ?")
        .all(provider, limit) as JobRow[])
    : (db()
        .prepare("SELECT * FROM jobs WHERE status = 'waiting' ORDER BY created_at ASC LIMIT ?")
        .all(limit) as JobRow[]);
  return rows.map(rowToJob);
}

// ── Spend Ledger & Budget Settings ───────────────────────────────────────────

interface SpendRow {
  id: string;
  job_id: string;
  provider: string;
  model_id: string;
  estimated_usd: number;
  actual_usd: number | null;
  credits: number | null;
  status: string;
  created_at: number;
  updated_at: number;
}

function rowToSpend(r: SpendRow): SpendLedgerEntry {
  return {
    id: r.id,
    jobId: r.job_id,
    provider: r.provider as ProviderId,
    modelId: r.model_id,
    estimatedUsd: r.estimated_usd,
    actualUsd: r.actual_usd,
    credits: r.credits,
    status: r.status as SpendLedgerEntry["status"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertSpendEntry(entry: SpendLedgerEntry): void {
  db()
    .prepare(
      `INSERT INTO spend_ledger (id, job_id, provider, model_id, estimated_usd, actual_usd, credits, status, created_at, updated_at)
       VALUES (@id, @job_id, @provider, @model_id, @estimated_usd, @actual_usd, @credits, @status, @created_at, @updated_at)`
    )
    .run({
      id: entry.id,
      job_id: entry.jobId,
      provider: entry.provider,
      model_id: entry.modelId,
      estimated_usd: entry.estimatedUsd,
      actual_usd: entry.actualUsd,
      credits: entry.credits,
      status: entry.status,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    });
}

export function updateSpendByJobId(
  jobId: string,
  patch: Partial<Pick<SpendLedgerEntry, "actualUsd" | "credits" | "status">>
): void {
  const sets: string[] = ["updated_at = @updated_at"];
  const args: Record<string, unknown> = { job_id: jobId, updated_at: Date.now() };
  if (patch.actualUsd !== undefined) {
    sets.push("actual_usd = @actual_usd");
    args.actual_usd = patch.actualUsd;
  }
  if (patch.credits !== undefined) {
    sets.push("credits = @credits");
    args.credits = patch.credits;
  }
  if (patch.status !== undefined) {
    sets.push("status = @status");
    args.status = patch.status;
  }
  db().prepare(`UPDATE spend_ledger SET ${sets.join(", ")} WHERE job_id = @job_id`).run(args);
}

export function listSpendEntries(limit = 50): SpendLedgerEntry[] {
  const rows = db()
    .prepare("SELECT * FROM spend_ledger ORDER BY created_at DESC LIMIT ?")
    .all(limit) as SpendRow[];
  return rows.map(rowToSpend);
}

export function sumSpendSince(sinceMs: number): number {
  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(COALESCE(actual_usd, estimated_usd)), 0) AS total
       FROM spend_ledger
       WHERE status != 'refunded' AND created_at >= ?`
    )
    .get(sinceMs) as { total: number };
  return Number(row.total ?? 0);
}

export function sumSpendByProvider(): Record<string, { usd: number; credits: number; count: number }> {
  const rows = db()
    .prepare(
      `SELECT provider,
              COALESCE(SUM(CASE WHEN status != 'refunded' THEN COALESCE(actual_usd, estimated_usd) ELSE 0 END), 0) AS usd,
              COALESCE(SUM(CASE WHEN status != 'refunded' THEN COALESCE(credits, 0) ELSE 0 END), 0) AS credits,
              COUNT(*) AS count
       FROM spend_ledger
       GROUP BY provider`
    )
    .all() as Array<{ provider: string; usd: number; credits: number; count: number }>;
  const out: Record<string, { usd: number; credits: number; count: number }> = {};
  for (const r of rows) {
    out[r.provider] = { usd: Number(r.usd), credits: Number(r.credits), count: Number(r.count) };
  }
  return out;
}

export function readBudgetSettings(): BudgetSettings {
  const row = db()
    .prepare("SELECT * FROM budget_settings WHERE id = 1")
    .get() as {
    daily_budget_usd: number;
    monthly_budget_usd: number;
    router_strategy: string;
    supercomputer_mode: string;
    updated_at: number;
  };
  return {
    dailyBudgetUsd: Number(row.daily_budget_usd),
    monthlyBudgetUsd: Number(row.monthly_budget_usd),
    routerStrategy: row.router_strategy as RouterStrategy,
    supercomputerMode: row.supercomputer_mode as BudgetSettings["supercomputerMode"],
    updatedAt: row.updated_at,
  };
}

export function writeBudgetSettings(
  patch: Partial<Omit<BudgetSettings, "updatedAt">>
): BudgetSettings {
  const cur = readBudgetSettings();
  const next: BudgetSettings = {
    dailyBudgetUsd: patch.dailyBudgetUsd ?? cur.dailyBudgetUsd,
    monthlyBudgetUsd: patch.monthlyBudgetUsd ?? cur.monthlyBudgetUsd,
    routerStrategy: patch.routerStrategy ?? cur.routerStrategy,
    supercomputerMode: patch.supercomputerMode ?? cur.supercomputerMode,
    updatedAt: Date.now(),
  };
  db()
    .prepare(
      `UPDATE budget_settings
       SET daily_budget_usd = ?, monthly_budget_usd = ?, router_strategy = ?, supercomputer_mode = ?, updated_at = ?
       WHERE id = 1`
    )
    .run(
      next.dailyBudgetUsd,
      next.monthlyBudgetUsd,
      next.routerStrategy,
      next.supercomputerMode,
      next.updatedAt
    );
  return next;
}

// ── Campaigns (Supercomputer Agent) ──────────────────────────────────────────

interface CampaignRow {
  id: string;
  brand_name: string;
  brief: string;
  objective: string;
  target_audience: string;
  platforms: string;
  skill_ids: string;
  engine: string;
  engine_reason: string;
  upstream_session_id: string | null;
  status: string;
  script: string | null;
  storyboard: string;
  captions: string;
  trace: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToCampaign(r: CampaignRow): CampaignRecord {
  return {
    id: r.id,
    brandName: r.brand_name,
    brief: r.brief,
    objective: r.objective,
    targetAudience: r.target_audience,
    platforms: parseJson<string[]>(r.platforms, []),
    skillIds: parseJson<string[]>(r.skill_ids, []),
    engine: r.engine as CampaignRecord["engine"],
    engineReason: r.engine_reason,
    upstreamSessionId: r.upstream_session_id,
    status: r.status as CampaignRecord["status"],
    script: parseJson<CampaignRecord["script"]>(r.script, null),
    storyboard: parseJson<CampaignScene[]>(r.storyboard, []),
    captions: parseJson<CampaignCaption[]>(r.captions, []),
    trace: parseJson<CampaignTraceEvent[]>(r.trace, []),
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertCampaign(c: CampaignRecord): void {
  db()
    .prepare(
      `INSERT INTO campaigns (
        id, brand_name, brief, objective, target_audience, platforms, skill_ids,
        engine, engine_reason, upstream_session_id, status, script, storyboard,
        captions, trace, error, created_at, updated_at
      ) VALUES (
        @id, @brand_name, @brief, @objective, @target_audience, @platforms, @skill_ids,
        @engine, @engine_reason, @upstream_session_id, @status, @script, @storyboard,
        @captions, @trace, @error, @created_at, @updated_at
      )`
    )
    .run({
      id: c.id,
      brand_name: c.brandName,
      brief: c.brief,
      objective: c.objective,
      target_audience: c.targetAudience,
      platforms: JSON.stringify(c.platforms),
      skill_ids: JSON.stringify(c.skillIds),
      engine: c.engine,
      engine_reason: c.engineReason,
      upstream_session_id: c.upstreamSessionId,
      status: c.status,
      script: c.script ? JSON.stringify(c.script) : null,
      storyboard: JSON.stringify(c.storyboard),
      captions: JSON.stringify(c.captions),
      trace: JSON.stringify(c.trace),
      error: c.error,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
}

export function getCampaign(id: string): CampaignRecord | null {
  const row = db().prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as CampaignRow | undefined;
  return row ? rowToCampaign(row) : null;
}

export function listCampaigns(limit = 30): CampaignRecord[] {
  const rows = db()
    .prepare("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ?")
    .all(limit) as CampaignRow[];
  return rows.map(rowToCampaign);
}

export function updateCampaign(
  id: string,
  patch: Partial<
    Pick<
      CampaignRecord,
      | "engine"
      | "engineReason"
      | "upstreamSessionId"
      | "status"
      | "skillIds"
      | "script"
      | "storyboard"
      | "captions"
      | "trace"
      | "error"
    >
  >
): void {
  const sets: string[] = ["updated_at = @updated_at"];
  const args: Record<string, unknown> = { id, updated_at: Date.now() };
  if (patch.engine !== undefined) {
    sets.push("engine = @engine");
    args.engine = patch.engine;
  }
  if (patch.engineReason !== undefined) {
    sets.push("engine_reason = @engine_reason");
    args.engine_reason = patch.engineReason;
  }
  if (patch.upstreamSessionId !== undefined) {
    sets.push("upstream_session_id = @upstream_session_id");
    args.upstream_session_id = patch.upstreamSessionId;
  }
  if (patch.status !== undefined) {
    sets.push("status = @status");
    args.status = patch.status;
  }
  if (patch.skillIds !== undefined) {
    sets.push("skill_ids = @skill_ids");
    args.skill_ids = JSON.stringify(patch.skillIds);
  }
  if (patch.script !== undefined) {
    sets.push("script = @script");
    args.script = patch.script ? JSON.stringify(patch.script) : null;
  }
  if (patch.storyboard !== undefined) {
    sets.push("storyboard = @storyboard");
    args.storyboard = JSON.stringify(patch.storyboard);
  }
  if (patch.captions !== undefined) {
    sets.push("captions = @captions");
    args.captions = JSON.stringify(patch.captions);
  }
  if (patch.trace !== undefined) {
    sets.push("trace = @trace");
    args.trace = JSON.stringify(patch.trace);
  }
  if (patch.error !== undefined) {
    sets.push("error = @error");
    args.error = patch.error;
  }
  db().prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = @id`).run(args);
}

// ── Publish Queue (Postiz Approval Gate) ─────────────────────────────────────

interface PublishRow {
  id: string;
  campaign_id: string | null;
  job_id: string | null;
  platform: string;
  integration_id: string | null;
  caption: string;
  hashtags: string;
  media_paths: string;
  scheduled_at: string | null;
  approval_status: string;
  approved_by: string | null;
  approved_at: number | null;
  rejection_reason: string | null;
  postiz_post_id: string | null;
  publish_status: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToPublish(r: PublishRow): PublishQueueRecord {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    jobId: r.job_id,
    platform: r.platform,
    integrationId: r.integration_id,
    caption: r.caption,
    hashtags: parseJson<string[]>(r.hashtags, []),
    mediaPaths: parseJson<string[]>(r.media_paths, []),
    scheduledAt: r.scheduled_at,
    approvalStatus: r.approval_status as ApprovalStatus,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    rejectionReason: r.rejection_reason,
    postizPostId: r.postiz_post_id,
    publishStatus: r.publish_status as PublishStatus,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertPublishItem(item: PublishQueueRecord): void {
  db()
    .prepare(
      `INSERT INTO publish_queue (
        id, campaign_id, job_id, platform, integration_id, caption, hashtags,
        media_paths, scheduled_at, approval_status, approved_by, approved_at,
        rejection_reason, postiz_post_id, publish_status, error, created_at, updated_at
      ) VALUES (
        @id, @campaign_id, @job_id, @platform, @integration_id, @caption, @hashtags,
        @media_paths, @scheduled_at, @approval_status, @approved_by, @approved_at,
        @rejection_reason, @postiz_post_id, @publish_status, @error, @created_at, @updated_at
      )`
    )
    .run({
      id: item.id,
      campaign_id: item.campaignId,
      job_id: item.jobId,
      platform: item.platform,
      integration_id: item.integrationId,
      caption: item.caption,
      hashtags: JSON.stringify(item.hashtags),
      media_paths: JSON.stringify(item.mediaPaths),
      scheduled_at: item.scheduledAt,
      approval_status: item.approvalStatus,
      approved_by: item.approvedBy,
      approved_at: item.approvedAt,
      rejection_reason: item.rejectionReason,
      postiz_post_id: item.postizPostId,
      publish_status: item.publishStatus,
      error: item.error,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    });
}

export function getPublishItem(id: string): PublishQueueRecord | null {
  const row = db().prepare("SELECT * FROM publish_queue WHERE id = ?").get(id) as
    | PublishRow
    | undefined;
  return row ? rowToPublish(row) : null;
}

export function listPublishItems(opts?: {
  approvalStatus?: ApprovalStatus;
  campaignId?: string;
  limit?: number;
}): PublishQueueRecord[] {
  const where: string[] = [];
  const args: Record<string, unknown> = { limit: opts?.limit ?? 50 };
  if (opts?.approvalStatus) {
    where.push("approval_status = @approval_status");
    args.approval_status = opts.approvalStatus;
  }
  if (opts?.campaignId) {
    where.push("campaign_id = @campaign_id");
    args.campaign_id = opts.campaignId;
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db()
    .prepare(`SELECT * FROM publish_queue ${clause} ORDER BY created_at DESC LIMIT @limit`)
    .all(args) as PublishRow[];
  return rows.map(rowToPublish);
}

export function updatePublishItem(
  id: string,
  patch: Partial<
    Pick<
      PublishQueueRecord,
      | "integrationId"
      | "caption"
      | "hashtags"
      | "mediaPaths"
      | "scheduledAt"
      | "approvalStatus"
      | "approvedBy"
      | "approvedAt"
      | "rejectionReason"
      | "postizPostId"
      | "publishStatus"
      | "error"
    >
  >
): void {
  const sets: string[] = ["updated_at = @updated_at"];
  const args: Record<string, unknown> = { id, updated_at: Date.now() };
  if (patch.integrationId !== undefined) {
    sets.push("integration_id = @integration_id");
    args.integration_id = patch.integrationId;
  }
  if (patch.caption !== undefined) {
    sets.push("caption = @caption");
    args.caption = patch.caption;
  }
  if (patch.hashtags !== undefined) {
    sets.push("hashtags = @hashtags");
    args.hashtags = JSON.stringify(patch.hashtags);
  }
  if (patch.mediaPaths !== undefined) {
    sets.push("media_paths = @media_paths");
    args.media_paths = JSON.stringify(patch.mediaPaths);
  }
  if (patch.scheduledAt !== undefined) {
    sets.push("scheduled_at = @scheduled_at");
    args.scheduled_at = patch.scheduledAt;
  }
  if (patch.approvalStatus !== undefined) {
    sets.push("approval_status = @approval_status");
    args.approval_status = patch.approvalStatus;
  }
  if (patch.approvedBy !== undefined) {
    sets.push("approved_by = @approved_by");
    args.approved_by = patch.approvedBy;
  }
  if (patch.approvedAt !== undefined) {
    sets.push("approved_at = @approved_at");
    args.approved_at = patch.approvedAt;
  }
  if (patch.rejectionReason !== undefined) {
    sets.push("rejection_reason = @rejection_reason");
    args.rejection_reason = patch.rejectionReason;
  }
  if (patch.postizPostId !== undefined) {
    sets.push("postiz_post_id = @postiz_post_id");
    args.postiz_post_id = patch.postizPostId;
  }
  if (patch.publishStatus !== undefined) {
    sets.push("publish_status = @publish_status");
    args.publish_status = patch.publishStatus;
  }
  if (patch.error !== undefined) {
    sets.push("error = @error");
    args.error = patch.error;
  }
  db().prepare(`UPDATE publish_queue SET ${sets.join(", ")} WHERE id = @id`).run(args);
}
