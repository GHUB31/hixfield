"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The signature Higgsfield cinema tile: crisp poster frame immediately visible,
 * seamless looping video playback on hover/focus, lime selection ring + mono tag.
 */
export function PresetCard({
  name,
  description,
  previewUrl,
  posterUrl,
  category,
  selected = false,
  selectionTag,
  onSelect,
  disabled,
  aspect = "aspect-video",
  className,
}: {
  name: string;
  description?: string;
  previewUrl?: string;
  posterUrl?: string;
  category?: string;
  selected?: boolean;
  selectionTag?: string;
  onSelect?: () => void;
  disabled?: boolean;
  aspect?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mode, setMode] = useState<"hover" | "autoplay" | "still">("hover");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMode("still");
    } else if (window.matchMedia("(hover: none)").matches) {
      setMode("autoplay");
    }
  }, []);

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
    setHovered(true);
    if (mode === "hover") videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    setHovered(false);
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
        "group relative block w-full overflow-hidden rounded-xl border bg-ink-900 text-left transition-all duration-300",
        selected
          ? "border-lime-400 ring-1 ring-lime-400"
          : "border-ink-800 hover:border-ink-600",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <div className={cn("relative w-full overflow-hidden bg-ink-900", aspect)}>
        {/* Crisp immediate poster image */}
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}

        {/* Looping preview video plays seamlessly on hover */}
        {previewUrl && inView && (
          <video
            ref={videoRef}
            src={posterUrl ? previewUrl : `${previewUrl}#t=0.1`}
            poster={posterUrl}
            muted
            loop
            playsInline
            preload={posterUrl ? "metadata" : "auto"}
            className={cn(
              "absolute inset-0 size-full object-cover transition-all duration-500 group-hover:scale-[1.04]",
              posterUrl && !hovered && mode === "hover" ? "opacity-0" : "opacity-100"
            )}
          />
        )}

        {/* Category pill */}
        {category && (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-ink-50/10 bg-ink-950/70 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-200 backdrop-blur-md">
            {category}
          </span>
        )}

        {/* Subtle play glyph on hover when unselected */}
        {!selected && previewUrl && (
          <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-ink-950/65 text-ink-200 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
            <Play className="size-3 fill-current" aria-hidden />
          </span>
        )}

        {/* Lime selection badge */}
        {selected && (
          <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md bg-lime-400 font-mono text-xs font-bold text-ink-950 shadow-[0_2px_10px_rgba(204,255,0,0.35)]">
            {selectionTag ?? <Check className="size-3.5" aria-hidden />}
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 via-ink-950/75 to-transparent px-3.5 pb-3 pt-10">
        <p className="truncate text-sm font-semibold tracking-tight text-ink-50">{name}</p>
        {description && (
          <p className="mt-0.5 truncate text-[12px] text-ink-300">{description}</p>
        )}
      </div>
    </button>
  );
}
