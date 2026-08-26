"use client";

import { cn } from "@/lib/utils";

/**
 * Image sibling of PresetCard: the identical tile frame for styles
 * whose catalog preview is a still image instead of a looping video.
 */
export function StyleCard({
  name,
  description,
  previewUrl,
  selected = false,
  onSelect,
  disabled,
  aspect = "aspect-[3/4]",
  className,
}: {
  name: string;
  description?: string;
  /** Still preview image URL from the live catalog. */
  previewUrl?: string;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  aspect?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl border bg-ink-900 text-left transition-colors",
        selected
          ? "border-lime-400 ring-1 ring-lime-400"
          : "border-ink-700 hover:border-ink-600",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <div className={cn("relative w-full overflow-hidden bg-ink-850", aspect)}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-600">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
              <path d="m5 17 4.5-4.5 3 3L16 12l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {selected && (
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-lime-400 font-mono text-xs font-bold text-ink-950">
            ✓
          </span>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent px-3 pb-2.5 pt-8">
        <p className="truncate text-sm font-medium text-ink-50">{name}</p>
        {description && <p className="truncate text-xs text-ink-300">{description}</p>}
      </div>
    </button>
  );
}
