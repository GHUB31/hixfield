"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCommand({
  command,
  display,
  className,
}: {
  command: string;
  display?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — the text is selectable either way
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "group inline-flex max-w-full items-center gap-3 rounded-lg border border-ink-600 bg-ink-950/80 px-4 py-3 text-left font-mono text-[13px] text-ink-100 backdrop-blur transition-colors hover:border-lime-400/60",
        className
      )}
      aria-label={`Copy command: ${command}`}
    >
      <span className="select-all truncate">
        <span className="text-ink-400">$ </span>
        {display ?? command}
      </span>
      {copied ? (
        <Check className="size-4 shrink-0 text-lime-400" aria-hidden />
      ) : (
        <Copy className="size-4 shrink-0 text-ink-400 transition-colors group-hover:text-lime-400" aria-hidden />
      )}
    </button>
  );
}
