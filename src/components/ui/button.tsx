"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#d1fe17] text-black font-bold hover:bg-[#dcff4a] active:scale-[0.99] " +
    "disabled:bg-white/[0.08] disabled:text-white/35 disabled:cursor-not-allowed",
  secondary:
    "bg-white/[0.07] text-white font-medium border border-white/[0.1] hover:bg-white/[0.12] hover:border-white/[0.16] " +
    "disabled:opacity-45 disabled:cursor-not-allowed",
  ghost:
    "text-white/65 font-medium hover:text-white hover:bg-white/[0.07] " +
    "disabled:opacity-45 disabled:cursor-not-allowed",
  danger:
    "bg-danger/10 text-danger font-medium border border-danger/25 hover:bg-danger/20 " +
    "disabled:opacity-45 disabled:cursor-not-allowed",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-[13px] rounded-xl gap-2",
  lg: "h-11 px-5 text-[14px] rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all select-none cursor-pointer",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
