"use client";

import { cn } from "@/lib/utils";

/** Playhead-styled range control. Value renders in the mono data voice. */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  label,
  disabled,
  className,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="text-[13px] text-ink-300 whitespace-nowrap">{label}</span>}
      <input
        id={id}
        type="range"
        className="hx-range flex-1"
        style={{
          ["--range-track" as string]: `linear-gradient(to right, var(--color-lime-600) ${pct}%, var(--color-ink-700) ${pct}%)`,
        }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="font-mono text-xs text-ink-300 w-10 text-right">{value.toFixed(2)}</span>
    </div>
  );
}
