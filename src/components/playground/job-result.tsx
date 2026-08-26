"use client";

import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { postJSON } from "@/lib/fetcher";
import { isTerminalStatus, type JobRecord } from "@/lib/higgsfield/types";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { cn, formatCredits, shortId } from "@/lib/utils";

function Elapsed({ job }: { job: JobRecord }) {
  const active = !isTerminalStatus(job.status);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [active, job.id]);

  const end = active ? Date.now() : job.updatedAt;
  const seconds = Math.max(0, Math.floor((end - job.createdAt) / 1000));
  return (
    <span className="font-mono text-xs text-ink-300" aria-label="Elapsed time">
      {seconds}s
    </span>
  );
}

/** The shared generation flow: honest status while running, every asset when done, verbatim errors otherwise. */
export function JobResult({ job, onJob }: { job: JobRecord; onJob: (job: JobRecord) => void }) {
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const active = !isTerminalStatus(job.status);
  const expectsVideo = /2video|speak/.test(job.route);

  async function rerun() {
    setRerunning(true);
    setRerunError(null);
    try {
      const { job: next } = await postJSON<{ job: JobRecord }>(`/api/jobs/${job.id}/rerun`, {});
      onJob(next);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : "The rerun failed.");
    } finally {
      setRerunning(false);
    }
  }

  const tryAgain = (
    <div className="mt-3">
      <Button variant="secondary" size="sm" onClick={() => void rerun()} loading={rerunning}>
        <RotateCcw className="size-3.5" aria-hidden />
        Try again
      </Button>
      {rerunError && <p className="mt-2 text-[13px] text-danger">{rerunError}</p>}
    </div>
  );

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge status={job.status} />
        <Elapsed job={job} />
        {job.cost != null && (
          <span className="font-mono text-xs text-ink-300">{formatCredits(job.cost)} cr</span>
        )}
        <span className="ml-auto font-mono text-xs text-ink-400">{shortId(job.id)}</span>
      </div>

      {job.status === "waiting" && (
        <p className="mt-3 text-sm text-ink-300">Waiting for a free slot on your plan.</p>
      )}

      {active && (
        <div
          className={cn(
            "mt-4 w-full animate-pulse rounded-xl bg-ink-850",
            expectsVideo ? "aspect-video" : "aspect-[3/4]"
          )}
          aria-hidden
        />
      )}

      {job.status === "completed" && (
        <div className="mt-4 space-y-4">
          {job.assets.length === 0 && (
            <p className="text-sm text-ink-300">The job finished but returned no files.</p>
          )}
          {job.assets.map((asset) => (
            <figure key={asset.path}>
              {asset.type === "video" ? (
                <video
                  src={`/api/assets/${asset.path}`}
                  controls
                  loop
                  playsInline
                  className="w-full rounded-lg"
                />
              ) : asset.type === "audio" ? (
                <audio src={`/api/assets/${asset.path}`} controls className="w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/assets/${asset.path}`}
                  alt="Generated output"
                  className="w-full rounded-lg"
                />
              )}
              <figcaption className="mt-1.5 flex items-center justify-between">
                <a
                  href={`/api/assets/${asset.path}`}
                  download
                  className="inline-flex items-center gap-1.5 text-[13px] text-ink-300 transition-colors hover:text-lime-400"
                >
                  <Download className="size-3.5" aria-hidden />
                  Download
                </a>
                <span className="font-mono text-[11px] text-ink-400">{asset.type}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {(job.status === "failed" || job.status === "nsfw") && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-danger">{job.error ?? "The job failed."}</p>
          {tryAgain}
        </div>
      )}

      {job.status === "canceled" && (
        <div className="mt-4">
          <p className="text-sm text-ink-300">This job was canceled before it finished.</p>
          {tryAgain}
        </div>
      )}
    </div>
  );
}
