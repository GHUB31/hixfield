import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/higgsfield/types";

const STYLES: Record<JobStatus, { label: string; badge: string; dot: string; pulse?: boolean }> = {
  waiting: {
    label: "Waiting for a slot",
    badge: "text-ink-300 border-ink-600 bg-ink-800/60",
    dot: "bg-ink-400",
  },
  queued: {
    label: "Queued",
    badge: "text-ink-300 border-ink-600 bg-ink-800/60",
    dot: "bg-amber",
  },
  in_progress: {
    label: "Rendering",
    badge: "text-amber border-amber/30 bg-amber/10",
    dot: "bg-amber",
    pulse: true,
  },
  completed: {
    label: "Done",
    badge: "text-lime-400 border-lime-400/30 bg-lime-400/10",
    dot: "bg-lime-400",
  },
  failed: {
    label: "Failed",
    badge: "text-danger border-danger/30 bg-danger/10",
    dot: "bg-danger",
  },
  nsfw: {
    label: "Flagged NSFW",
    badge: "text-danger border-danger/30 bg-danger/10",
    dot: "bg-danger",
  },
  canceled: {
    label: "Canceled",
    badge: "text-ink-400 border-ink-700 bg-ink-800/40",
    dot: "bg-ink-600",
  },
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const s = STYLES[status] ?? STYLES.queued;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-wide",
        s.badge,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, s.pulse && "animate-lamp")} aria-hidden />
      {s.label}
    </span>
  );
}
