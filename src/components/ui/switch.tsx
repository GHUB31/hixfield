"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2.5 disabled:opacity-50",
        className
      )}
    >
      {/* shrink-0 + explicit left anchor keep the knob inside the track in any flex context */}
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-lime-400" : "bg-ink-700"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-4 rounded-full shadow transition-transform",
            checked ? "translate-x-4 bg-ink-950" : "translate-x-0 bg-ink-300"
          )}
        />
      </span>
      {label && <span className="text-[13px] text-ink-300">{label}</span>}
    </button>
  );
}
