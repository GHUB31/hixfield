"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  FlaskConical,
  Image as ImageIcon,
  Mic,
  Send,
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
  model: "Model",
};

const KIND_ICON: Record<JobKind, LucideIcon> = {
  dop: Clapperboard,
  soul: ImageIcon,
  character: UserRound,
  speak: Mic,
  model: FlaskConical,
};

export function JobCard({
  job,
  onOpen,
  onQueuePublish,
}: {
  job: JobRecord;
  onOpen: () => void;
  onQueuePublish?: (job: JobRecord) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hoverPlay, setHoverPlay] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHoverPlay(false);
    }
  }, []);

  const play = () => {
    if (hoverPlay) videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0.1;
    }
  };

  const first = job.assets[0];
  const Icon = KIND_ICON[job.kind] ?? Clapperboard;
  const promptText = typeof job.params.prompt === "string" ? job.params.prompt : "";

  return (
    <div
      onMouseEnter={play}
      onMouseLeave={stop}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0c] text-left transition-colors hover:border-white/[0.18]"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${KIND_LABEL[job.kind]} job details`}
        className="relative aspect-video w-full overflow-hidden bg-black text-left cursor-pointer"
      >
        {!first && (
          <div className="absolute inset-0 grid place-items-center text-white/25">
            <Icon className="size-7" aria-hidden />
          </div>
        )}
        {first?.type === "video" && (
          <video
            ref={videoRef}
            src={`/api/assets/${first.path}#t=0.1`}
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {first?.type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/${first.path}`}
            alt={`${KIND_LABEL[job.kind]} output`}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}

        {job.provider && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md">
            {job.provider}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-white">
            {KIND_LABEL[job.kind]}
          </span>
          <StatusBadge status={job.status} />
        </div>

        {promptText && <p className="line-clamp-1 text-[12px] text-white/50">{promptText}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 font-mono text-[11px] text-white/40">
          <span>{timeAgo(job.createdAt)}</span>
          <div className="flex items-center gap-2">
            {job.estimatedCostUsd != null && <span>${job.estimatedCostUsd.toFixed(2)}</span>}
            {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
          </div>
        </div>

        {first && job.status === "completed" && (
          <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
            {first.type === "image" && (
              <Link
                href={`/create/video?image=${encodeURIComponent(`/api/assets/${first.path}`)}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#d1fe17] px-2.5 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-[#dcff4a]"
              >
                <Clapperboard className="size-3" aria-hidden />
                Animate
              </Link>
            )}
            {onQueuePublish && (
              <button
                type="button"
                onClick={() => onQueuePublish(job)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/[0.12] cursor-pointer"
              >
                <Send className="size-3" aria-hidden />
                Publish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
