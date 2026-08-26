"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  FlaskConical,
  Image as ImageIcon,
  Mic,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCredits, timeAgo } from "@/lib/utils";
import type { JobKind, JobRecord } from "@/lib/higgsfield/types";

export const KIND_LABEL: Record<JobKind, string> = {
  dop: "Video",
  soul: "Image",
  character: "Character",
  speak: "Speak",
  model: "Playground",
};

const KIND_ICON: Record<JobKind, LucideIcon> = {
  dop: Clapperboard,
  soul: ImageIcon,
  character: UserRound,
  speak: Mic,
  model: FlaskConical,
};

/**
 * One job in the library grid. Video outputs preview on hover
 * (pause and reset on leave); images render still; jobs without
 * output show the kind's icon on a dark placeholder.
 */
export function JobCard({ job, onOpen }: { job: JobRecord; onOpen: () => void }) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hoverPlay, setHoverPlay] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHoverPlay(false);
    }
  }, []);

  // Mount video elements only near the viewport; a long library must stay light.
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

  const play = () => {
    if (hoverPlay) videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const first = job.assets[0];
  const Icon = KIND_ICON[job.kind] ?? Clapperboard;

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onOpen}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      aria-label={`Open ${KIND_LABEL[job.kind]} job details`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 text-left transition-colors hover:border-ink-600"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-ink-850">
        <div className="absolute inset-0 grid place-items-center text-ink-600">
          <Icon className="size-7" aria-hidden />
        </div>
        {first?.type === "video" && inView && (
          <video
            ref={videoRef}
            src={`/api/assets/${first.path}`}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {first?.type === "image" && (
          <img
            src={`/api/assets/${first.path}`}
            alt={`${KIND_LABEL[job.kind]} output`}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink-100">
            {KIND_LABEL[job.kind]}
          </span>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-ink-400">
          <span>{timeAgo(job.createdAt)}</span>
          {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
        </div>
      </div>
    </button>
  );
}
