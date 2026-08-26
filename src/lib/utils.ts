export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function formatCredits(cost: number | null): string {
  if (cost === null) return "—";
  return Number.isInteger(cost) ? String(cost) : cost.toFixed(2);
}

/** Short id for display: first block of a UUID. */
export function shortId(id: string): string {
  return id.split("-")[0] ?? id;
}
