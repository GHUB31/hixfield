"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** A looping clip tile for the landing reel. Plays in view, honors reduced motion. */
export function LoopTile({
  src,
  poster,
  label,
  sublabel,
  aspect = "aspect-video",
  className,
}: {
  src: string;
  poster?: string;
  label: string;
  sublabel?: string;
  aspect?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "160px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView && !still) video.play().catch(() => {});
    else video.pause();
  }, [inView, still]);

  return (
    <figure
      ref={rootRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900",
        className
      )}
    >
      <div className={cn("relative w-full", aspect)}>
        {inView && (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {!inView && poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 to-transparent px-3.5 pb-3 pt-10">
        <span className="block font-mono text-xs tracking-wide text-lime-400">{label}</span>
        {sublabel && <span className="mt-0.5 block text-xs text-ink-300">{sublabel}</span>}
      </figcaption>
    </figure>
  );
}
