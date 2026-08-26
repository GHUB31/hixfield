import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-lime-400 text-ink-950 font-semibold hover:bg-lime-300 active:translate-y-px shadow-[0_2px_12px_rgba(204,255,0,0.15)]",
  secondary:
    "bg-ink-800 text-ink-50 border border-ink-700 hover:border-ink-600 hover:bg-ink-700/60 active:translate-y-px",
  ghost: "text-ink-300 hover:text-ink-50 hover:bg-ink-800",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[15px] rounded-lg gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  // A disabled primary action reads as explicitly off, never as a dim enabled button.
  const off = variant === "primary" && disabled && !loading;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-colors select-none",
        off
          ? "border border-ink-700 bg-ink-800 font-semibold text-ink-400 pointer-events-none"
          : VARIANTS[variant],
        SIZES[size],
        !off && (disabled || loading) && "opacity-50 pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
