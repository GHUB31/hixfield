"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StyleCard({
  name,
  description,
  previewUrl,
  selected = false,
  onSelect,
  disabled,
  aspect = "aspect-[3/4]",
  className,
}: {
  name: string;
  description?: string;
  previewUrl?: string;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  aspect?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {selected && (
          <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md bg-[#d1fe17] text-black shadow-sm">
            <Check className="size-3.5 stroke-[2.5]" aria-hidden />
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
