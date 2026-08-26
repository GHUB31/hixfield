"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The signature component: a preset as a looping video tile.
 * Desktop plays on hover/focus; touch devices play while in view;
 * prefers-reduced-motion gets the still first frame.
 */
export function PresetCard({
  name,
  description,
  previewUrl,
  selected = false,
  selectionTag,
  onSelect,
  disabled,
  aspect = "aspect-video",
  className,
}: {
  name: string;
  description?: string;
  /** Looping preview video URL from the live catalog. */
  previewUrl?: string;
  selected?: boolean;
  /** "A" / "B" when two motions stack. */
  selectionTag?: string;
  onSelect?: () => void;
  disabled?: boolean;
  aspect?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [mode, setMode] = useState<"hover" | "autoplay" | "still">("hover");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMode("still");
    } else if (window.matchMedia("(hover: none)").matches) {
      setMode("autoplay");
    }
  }, []);

  // Load the video only near the viewport; a 50-preset gallery must stay light.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "240px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (mode === "autoplay" && inView) {
      video.play().catch(() => {});
    } else if (!inView || mode !== "autoplay") {
      video.pause();
    }
  }, [inView, mode]);

  const play = () => {
    if (mode === "hover") videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    if (mode === "hover" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onSelect}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
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
        {previewUrl && inView ? (
          <video
            ref={videoRef}
            src={previewUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-600">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
            </svg>
          </div>
        )}
        {selected && (
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-lime-400 font-mono text-xs font-bold text-ink-950">
            {selectionTag ?? <Check className="size-3.5" aria-hidden />}
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
