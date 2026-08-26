import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { dataDir } from "@/lib/env";
import type { AssetRef, JobKind, JobRecord, JobStatus } from "@/lib/higgsfield/types";

const SCHEMA = `
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_kind ON jobs(kind);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
`;

type GlobalCache = { __hixdb?: Database.Database };
const g = globalThis as unknown as GlobalCache;

export function db(): Database.Database {
  if (!g.__hixdb) {
    fs.mkdirSync(dataDir(), { recursive: true });
    const d = new Database(path.join(dataDir(), "hixfield.db"));
    d.pragma("journal_mode = WAL");
    d.exec(SCHEMA);
    g.__hixdb = d;
  }
  return g.__hixdb;
}

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
  created_at: number;
  updated_at: number;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
      `INSERT INTO jobs (id, job_set_id, kind, route, params, status, assets, error, cost, created_at, updated_at)
       VALUES (@id, @job_set_id, @kind, @route, @params, @status, @assets, @error, @cost, @created_at, @updated_at)`
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
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    });
}

export function updateJob(
  id: string,
  patch: Partial<Pick<JobRecord, "jobSetId" | "status" | "assets" | "error" | "cost">>
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
  db().prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = @id`).run(args);
}

export function listJobRecords(opts: {
  kind?: JobKind;
  status?: JobStatus;
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
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db().prepare(`SELECT COUNT(*) AS n FROM jobs ${clause}`).get(args) as { n: number }
  ).n;
  const rows = db()
    .prepare(`SELECT * FROM jobs ${clause} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...args, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }) as JobRow[];
  return { jobs: rows.map(rowToJob), total };
}

/** Jobs currently occupying an upstream concurrency slot. */
export function activeUpstreamCount(): number {
  const row = db()
    .prepare(
      "SELECT COUNT(*) AS n FROM jobs WHERE job_set_id IS NOT NULL AND status IN ('queued','in_progress')"
    )
    .get() as { n: number };
  return row.n;
}

export function oldestWaitingJobs(limit: number): JobRecord[] {
  const rows = db()
    .prepare("SELECT * FROM jobs WHERE status = 'waiting' ORDER BY created_at ASC LIMIT ?")
    .all(limit) as JobRow[];
  return rows.map(rowToJob);
}
