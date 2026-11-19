"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getJSON } from "@/lib/fetcher";

interface StatusRes {
  hasKeys: boolean;
  secrets?: { higgsfield: boolean; comfyui: boolean; huggingface: boolean };
}

/**
 * Shown across the studio when neither Higgsfield API nor ComfyUI GPU is configured.
 * Teaches server-side setup without exposing keys to the browser.
 */
export function KeysBanner() {
  const [status, setStatus] = useState<StatusRes | null>(null);

  useEffect(() => {
    getJSON<StatusRes>("/api/status")
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;
  if (status.hasKeys || status.secrets?.comfyui) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-50">
            Connect Higgsfield API or a ComfyUI Colab GPU worker
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-300">
            Add server-side credentials in{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-ink-100">
              .env
            </code>{" "}
            for Higgsfield (
            <a
              href="https://cloud.higgsfield.ai"
              target="_blank"
              rel="noreferrer"
              className="text-lime-400 underline decoration-lime-400/40 underline-offset-2 hover:decoration-lime-400"
            >
              cloud.higgsfield.ai
            </a>
            ) or point{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-ink-100">
              COMFYUI_BASE_URL
            </code>{" "}
            at your Colab GPU notebook. Local FFmpeg 2D motion fallback remains available at $0 for
            end-to-end testing.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-xs">
            <Link
              href="/routing"
              className="text-lime-400 underline decoration-lime-400/40 underline-offset-2 hover:decoration-lime-400"
            >
              Inspect provider health &amp; spend caps →
            </Link>
            <span className="text-ink-400">Keys stay strictly server-side.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
