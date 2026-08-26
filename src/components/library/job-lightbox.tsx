"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, deleteJSON, postJSON } from "@/lib/fetcher";
import { isTerminalStatus, type JobRecord } from "@/lib/higgsfield/types";
import { formatCredits, shortId } from "@/lib/utils";
import { KIND_LABEL } from "./job-card";

/**
 * Full-screen detail overlay for one job: every asset at full size,
 * the exact parameters, and the run again / download / delete actions.
 */
export function JobLightbox({
  job,
  onClose,
  onRerun,
  onDeleted,
}: {
  job: JobRecord;
  onClose: () => void;
  onRerun: (next: JobRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [rerunning, setRerunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Simple focus trap: land on the close button; Esc leaves.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // The armed delete disarms itself after 4 seconds.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  async function handleRerun() {
    setRerunning(true);
    setActionError(null);
    try {
      const { job: next } = await postJSON<{ job: JobRecord }>(
        `/api/jobs/${job.id}/rerun`,
        {}
      );
      onRerun(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setActionError(
          "Add your Higgsfield API key first, instructions are in the banner above."
        );
      } else {
        setActionError(err instanceof Error ? err.message : "The rerun failed.");
      }
    } finally {
      setRerunning(false);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await deleteJSON<{ ok: boolean }>(`/api/jobs/${job.id}`);
      onDeleted(job.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "The delete failed.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${KIND_LABEL[job.kind]} job details`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-ink-700 bg-ink-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-medium text-ink-50">
              {KIND_LABEL[job.kind]}
            </span>
            <span className="font-mono text-xs text-ink-400">#{shortId(job.id)}</span>
            <StatusBadge status={job.status} />
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {job.assets.length > 0 ? (
            <div className="space-y-3">
              {job.assets.map((asset) =>
                asset.type === "video" ? (
                  <video
                    key={asset.path}
                    src={`/api/assets/${asset.path}`}
                    controls
                    loop
                    playsInline
                    className="w-full rounded-lg bg-ink-950"
                  />
                ) : asset.type === "audio" ? (
                  <audio
                    key={asset.path}
                    src={`/api/assets/${asset.path}`}
                    controls
                    className="w-full"
                  />
                ) : (
                  <img
                    key={asset.path}
                    src={`/api/assets/${asset.path}`}
                    alt={`${KIND_LABEL[job.kind]} output`}
                    className="w-full rounded-lg"
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-300">
              {isTerminalStatus(job.status)
                ? "This job has no output files."
                : "No output yet. The library refreshes while the job runs."}
            </p>
          )}

          {job.error && <p className="text-sm text-danger">{job.error}</p>}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-400">Created</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink-100">
                {new Date(job.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Route</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-ink-100">
                {job.route}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Job id</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink-100">{shortId(job.id)}</dd>
            </div>
            {job.cost != null && (
              <div>
                <dt className="text-xs text-ink-400">Cost</dt>
                <dd className="mt-0.5 font-mono text-xs text-ink-100">
                  {formatCredits(job.cost)} cr
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="mb-1.5 text-xs text-ink-400">Parameters</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-xs leading-relaxed text-ink-300">
              {JSON.stringify(job.params, null, 2)}
            </pre>
          </div>

          <div className="border-t border-ink-700 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleRerun} loading={rerunning}>
                <RotateCcw className="size-4" aria-hidden />
                Run again
              </Button>
              {job.assets.map((asset, i) => (
                <a
                  key={asset.path}
                  href={`/api/assets/${asset.path}`}
                  download
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-800 px-3 text-[13px] text-ink-50 transition-colors hover:border-ink-600 hover:bg-ink-700/60"
                >
                  <Download className="size-4" aria-hidden />
                  {job.assets.length > 1 ? `Download ${i + 1}` : "Download"}
                </a>
              ))}
              <Button
                size="sm"
                variant={confirmingDelete ? "danger" : "secondary"}
                onClick={handleDelete}
                loading={deleting}
              >
                {confirmingDelete ? "Really delete?" : "Delete"}
              </Button>
            </div>
            {actionError && <p className="mt-3 text-sm text-danger">{actionError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
