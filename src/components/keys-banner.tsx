"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { getJSON } from "@/lib/fetcher";

/** Shown across the studio until a key pair is configured. Teaches the fix, then disappears. */
export function KeysBanner() {
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  useEffect(() => {
    getJSON<{ hasKeys: boolean }>("/api/status")
      .then((s) => setHasKeys(s.hasKeys))
      .catch(() => setHasKeys(null));
  }, []);

  if (hasKeys !== false) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-50">Connect your Higgsfield API key to start creating</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-300">
            Create a key pair at{" "}
            <a
              href="https://cloud.higgsfield.ai"
              target="_blank"
              rel="noreferrer"
              className="text-lime-400 underline decoration-lime-400/40 underline-offset-2 hover:decoration-lime-400"
            >
              cloud.higgsfield.ai
            </a>
            , put it in <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-ink-100">.env</code>, and restart:
          </p>
          <pre className="mt-2.5 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-ink-100">
{`HF_API_KEY_ID=your_key_id
HF_API_KEY_SECRET=your_key_secret`}
          </pre>
          <p className="mt-2 text-[13px] text-ink-400">
            Keys stay on your server. The browser never sees them.
          </p>
        </div>
      </div>
    </div>
  );
}
