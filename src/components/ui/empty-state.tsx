import { cn } from "@/lib/utils";

/** Empty states teach the first run — icon, one idea, one action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-ink-700 bg-ink-900 px-6 py-14 text-center",
        className
      )}
    >
      {icon && <div className="mb-4 text-lime-400/80 [&>svg]:size-8">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-50">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-300">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
