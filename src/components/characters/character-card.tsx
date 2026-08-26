import Link from "next/link";
import { cn, shortId } from "@/lib/utils";
import type { CharacterRecord } from "@/lib/higgsfield/types";

/**
 * Character training statuses are not job statuses, so they get their own
 * chips instead of StatusBadge.
 */
const CHIPS = {
  preparing: {
    label: "Preparing",
    badge: "text-ink-300 border-ink-600 bg-ink-800/60",
    dot: "bg-ink-400",
    pulse: false,
  },
  training: {
    label: "Training",
    badge: "text-amber border-amber/30 bg-amber/10",
    dot: "bg-amber",
    pulse: true,
  },
  ready: {
    label: "Ready",
    badge: "text-lime-400 border-lime-400/30 bg-lime-400/10",
    dot: "bg-lime-400",
    pulse: false,
  },
  failed: {
    label: "Failed",
    badge: "text-danger border-danger/30 bg-danger/10",
    dot: "bg-danger",
    pulse: false,
  },
} as const;

function chipFor(status: string) {
  if (status === "completed") return CHIPS.ready;
  if (status === "failed") return CHIPS.failed;
  if (status === "in_progress") return CHIPS.training;
  return CHIPS.preparing;
}

export function CharacterCard({ character }: { character: CharacterRecord }) {
  const chip = chipFor(character.status);
  const ready = character.status === "completed";
  const failed = character.status === "failed";
  const initial = (character.name.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-36 flex-col rounded-xl border border-ink-700 bg-ink-900 p-4 transition-colors hover:border-ink-600">
      <div className="flex items-center justify-between gap-2">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-sm font-semibold text-ink-100"
          aria-hidden
        >
          {initial}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-wide",
            chip.badge
          )}
        >
          <span className={cn("size-1.5 rounded-full", chip.dot, chip.pulse && "animate-lamp")} aria-hidden />
          {chip.label}
        </span>
      </div>

      <p className="mt-3 truncate text-sm font-medium text-ink-50" title={character.name}>
        {character.name}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-ink-400">{shortId(character.id)}</p>

      {failed && (
        <p className="mt-2 text-[13px] leading-snug text-danger">
          Training failed. Start a new character with clearer photos.
        </p>
      )}

      {ready && (
        <div className="mt-auto pt-3">
          <Link
            href={`/create/image?character=${character.id}`}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-ink-700 bg-ink-800 px-3 text-[13px] text-ink-50 transition-colors hover:border-ink-600 hover:bg-ink-700/60"
          >
            Use on Image page
          </Link>
        </div>
      )}
    </div>
  );
}
