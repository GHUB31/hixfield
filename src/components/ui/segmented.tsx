"use client";

import { cn } from "@/lib/utils";

/** Segmented picker for small exclusive sets — tiers, batch sizes, durations. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[13px] transition-colors",
              // Hover stops short of white so only the lime treatment ever reads as selected.
              active
                ? "bg-ink-700 font-medium text-lime-400"
                : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
