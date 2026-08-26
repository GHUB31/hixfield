"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "Mukhsin0508/hixfield";

/** Live star count; quietly drops the number if GitHub rate-limits. */
export function GitHubStars({ className }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stargazers_count?: number } | null) => {
        if (typeof d?.stargazers_count === "number") setStars(d.stargazers_count);
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href={`https://github.com/${REPO}`}
      target="_blank"
      rel="noreferrer"
      className={
        "inline-flex h-12 items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-900/80 px-5 text-[15px] font-medium text-ink-50 backdrop-blur transition-colors hover:border-ink-400 " +
        (className ?? "")
      }
    >
      <Star className="size-4 text-lime-400" aria-hidden />
      Star on GitHub
      <span
        className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-xs text-lime-400"
        aria-label={stars !== null ? `${stars} stars` : "star count loading"}
      >
        {stars !== null ? stars.toLocaleString() : "…"}
      </span>
    </a>
  );
}
