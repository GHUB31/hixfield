"use client";

import { useMemo, useState } from "react";
import { KeyRound, Search } from "lucide-react";
import type { Motion } from "@/lib/higgsfield/types";
import { PresetCard } from "@/components/preset-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * The visual lead of the page: the camera-motion catalog as a grid of
 * looping preview tiles, filtered instantly by the search box.
 */
export function MotionGallery({
  motions,
  loading,
  error,
  onRetry,
  selection,
  onToggle,
  limitHint,
}: {
  motions: Motion[] | null;
  loading: boolean;
  error: { message: string; code?: string } | null;
  onRetry: () => void;
  /** Selected motions in pick order; index 0 is A, index 1 is B. */
  selection: Motion[];
  onToggle: (motion: Motion) => void;
  /** True right after a third pick was refused. */
  limitHint: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!motions) return [];
    const q = query.trim().toLowerCase();
    if (!q) return motions;
    return motions.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
    );
  }, [motions, query]);

  function tagFor(id: string): "A" | "B" | undefined {
    const i = selection.findIndex((m) => m.id === id);
    return i === 0 ? "A" : i === 1 ? "B" : undefined;
  }

  if (error) {
    if (error.code === "missing_keys") {
      return (
        <EmptyState
          icon={<KeyRound aria-hidden />}
          title="Add your Higgsfield API key first"
          body="Instructions are in the banner above. The motion catalog loads once your keys are set."
        />
      );
    }
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900 px-6 py-12 text-center">
        <p className="text-sm text-danger">{error.message}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            type="search"
            className="pl-9"
            placeholder="Search camera moves"
            aria-label="Search camera moves"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        {motions && (
          <span className="shrink-0 font-mono text-xs text-ink-400">
            {filtered.length}/{motions.length}
          </span>
        )}
      </div>

      {limitHint && (
        <p role="status" className="text-[13px] text-amber">
          Two motions stack at most. Remove one first.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-ink-850" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-ink-700 bg-ink-900 px-6 py-10 text-center text-sm text-ink-300">
          {`No motions match "${query.trim()}". Try a different word.`}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => {
            const tag = tagFor(m.id);
            return (
              <PresetCard
                key={m.id}
                name={m.name}
                description={m.description}
                previewUrl={m.preview_url}
                selected={tag !== undefined}
                selectionTag={tag}
                onSelect={() => onToggle(m)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
