"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "group relative block w-full overflow-hidden rounded-2xl border bg-[#0b0b0c] text-left transition-all duration-300 cursor-pointer",
        selected
          ? "border-[#d1fe17] ring-1 ring-[#d1fe17]"
          : "border-white/[0.07] hover:border-white/[0.18]",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <div className={cn("relative w-full overflow-hidden bg-[#0b0b0c]", aspect)}>
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}

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

        {category && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md">
            {category}
          </span>
        )}

        {!selected && previewUrl && (
          <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
            <Play className="size-3 fill-current" aria-hidden />
          </span>
        )}

        {selected && (
          <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md bg-[#d1fe17] text-[11px] font-extrabold text-black shadow-sm">
            {selectionTag ?? <Check className="size-3.5" aria-hidden />}
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3.5 pb-3 pt-10">
        <p className="truncate text-[13px] font-semibold text-white">{name}</p>
        {description && (
          <p className="mt-0.5 truncate text-[11px] text-white/60">{description}</p>
        )}
      </div>
    </button>
  );
}
