"use client";

import { useEffect, useRef } from "react";

/** Full-bleed hero loop. Honors prefers-reduced-motion by holding the poster frame. */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.removeAttribute("autoplay");
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden>
      <video
        ref={ref}
        className="size-full object-cover"
        src="/media/hero-loop.mp4"
        poster="/media/hero-soundstage.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 via-transparent to-transparent" />
    </div>
  );
}
