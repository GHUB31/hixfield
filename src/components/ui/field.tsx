import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  help,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 text-[13px] font-medium text-ink-300">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : help ? (
        <p className="mt-1.5 text-[13px] text-ink-400">{help}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-lg bg-ink-900 border border-ink-700 px-3.5 text-sm text-ink-50 placeholder:text-ink-400 transition-colors hover:border-ink-600 focus:border-lime-400/70 focus:outline-none disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cn(CONTROL, "h-10", className)} {...rest} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={cn(CONTROL, "py-2.5 min-h-24 resize-y", className)} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <div className="relative">
      <select className={cn(CONTROL, "h-10 appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="m6 9 6 6 6-9" strokeLinecap="round" strokeLinejoin="round" transform="scale(1,0.9) translate(0,1)" />
      </svg>
    </div>
  );
}
