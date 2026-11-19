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
 * One job in the library grid. Videos paint their real first frame immediately
 * (`#t=0.1` + preload="auto") and play smoothly on hover; images & videos offer
 * one-click Animate (I2V) and Queue to Postiz actions.
 */
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
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900 text-left transition-colors hover:border-ink-600"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${KIND_LABEL[job.kind]} job details`}
        className="relative aspect-video w-full overflow-hidden bg-ink-950 text-left"
      >
        {!first && (
          <div className="absolute inset-0 grid place-items-center text-ink-600">
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
          <span className="absolute left-2.5 top-2.5 rounded-full border border-ink-50/10 bg-ink-950/75 px-2 py-0.5 font-mono text-[10px] text-ink-200 backdrop-blur-md">
            {job.provider}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink-100">
            {KIND_LABEL[job.kind]}
          </span>
          <StatusBadge status={job.status} />
        </div>

        {promptText && (
          <p className="line-clamp-1 text-xs text-ink-400">{promptText}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 font-mono text-[11px] text-ink-400">
          <span>{timeAgo(job.createdAt)}</span>
          <div className="flex items-center gap-2">
            {job.estimatedCostUsd != null && <span>${job.estimatedCostUsd.toFixed(2)}</span>}
            {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
          </div>
        </div>

        {first && job.status === "completed" && (
          <div className="flex items-center gap-1.5 border-t border-ink-800 pt-2">
            {first.type === "image" && (
              <Link
                href={`/create/video?image=${encodeURIComponent(`/api/assets/${first.path}`)}`}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-lime-400/30 bg-lime-400/10 px-2 py-1 font-mono text-[10px] text-lime-400 transition-colors hover:bg-lime-400/20"
              >
                <Clapperboard className="size-3" aria-hidden />
                Animate (I2V)
              </Link>
            )}
            {onQueuePublish && (
              <button
                type="button"
                onClick={() => onQueuePublish(job)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-50"
              >
                <Send className="size-3" aria-hidden />
                Queue Postiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
