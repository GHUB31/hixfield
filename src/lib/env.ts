import path from "node:path";

/** The Higgsfield key pair, or null when the app runs without credentials. */
export function hfKeys(): { id: string; secret: string } | null {
  const id = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

export function hasKeys(): boolean {
  return hfKeys() !== null;
}

/**
 * The API rejects submissions over the plan's concurrency cap with HTTP 400,
 * so Hixfield queues locally and keeps at most this many jobs in flight.
 */
export function maxConcurrency(): number {
  const n = Number(process.env.HF_MAX_CONCURRENCY ?? 3);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 3;
}

/** Root for the job database and downloaded assets (upstream URLs expire in ~7 days). */
export function dataDir(): string {
  return path.resolve(process.cwd(), process.env.DATA_DIR ?? "./data");
}

export function assetsDir(): string {
  return path.join(dataDir(), "assets");
}
