"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { getJSON } from "@/lib/fetcher";
import {
  isTerminalStatus,
  type JobKind,
  type JobRecord,
  type JobStatus,
} from "@/lib/higgsfield/types";
import { cn } from "@/lib/utils";
import { JobCard } from "./job-card";
import { JobLightbox } from "./job-lightbox";

const KIND_FILTERS: Array<{ value: JobKind | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "dop", label: "Video" },
  { value: "soul", label: "Image" },
  { value: "character", label: "Character" },
  { value: "speak", label: "Speak" },
  { value: "model", label: "Playground" },
];

const STATUS_FILTERS: Array<{ value: JobStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "waiting", label: "Waiting" },
  { value: "queued", label: "Queued" },
  { value: "in_progress", label: "Rendering" },
  { value: "completed", label: "Done" },
  { value: "failed", label: "Failed" },
  { value: "nsfw", label: "Flagged NSFW" },
  { value: "canceled", label: "Canceled" },
];

export function LibraryView() {
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<JobKind | "">("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (kindFilter) params.set("kind", kindFilter);
    if (statusFilter) params.set("status", statusFilter);
    return params.toString();
  }, [kindFilter, statusFilter]);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setJobs(null);
        setError(null);
      }
      try {
        const data = await getJSON<{ jobs: JobRecord[]; total: number }>(
          `/api/jobs?${query}`
        );
        setJobs(data.jobs);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "The request failed.");
        }
        // Silent refresh errors are transient; the next tick retries.
      }
    },
    [query]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // While any listed job is still running, refresh every 3 seconds.
  // Each refresh also lets the server push locally queued jobs upstream.
  const hasActive = useMemo(
    () => (jobs ?? []).some((j) => !isTerminalStatus(j.status)),
    [jobs]
  );

  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => void load(true), 3000);
    return () => clearInterval(timer);
  }, [hasActive, load]);

  const openJob = jobs?.find((j) => j.id === openId) ?? null;
  const unfiltered = kindFilter === "" && statusFilter === "";

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Library</h1>
        <p className="mt-1 text-sm text-ink-300">
          Every job you run, stored locally. Outputs survive the API&apos;s 7-day link
          expiry.
        </p>
      </header>

      <div className="animate-rise rise-1 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((opt) => {
            const active = opt.value === kindFilter;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setKindFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-lime-400 bg-lime-400/10 font-medium text-lime-400"
                    : "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-50"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {jobs !== null && (
            <span className="whitespace-nowrap font-mono text-xs text-ink-400">
              {total} {total === 1 ? "job" : "jobs"}
            </span>
          )}
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | "")}
            className="w-44"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="animate-rise rise-2 mt-5">
        {error ? (
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void load(false)}
            >
              Try again
            </Button>
          </div>
        ) : jobs === null ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900"
              >
                <div className="aspect-video animate-pulse bg-ink-850" />
                <div className="space-y-2 px-3 py-2.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-ink-850" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-ink-850" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          unfiltered ? (
            <EmptyState
              icon={<FolderOpen />}
              title="Your first render lands here"
              body="Everything you generate is saved to this machine, with the exact parameters, so you can rerun or download it any time."
              action={
                <div className="flex flex-col items-center gap-4">
                  <p className="font-mono text-xs tracking-wide text-ink-400">
                    00:00:00:00 · 0 cr
                  </p>
                  <Link
                    href="/create/video"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-lime-400 px-4 text-sm font-semibold text-ink-950 shadow-[0_2px_12px_rgba(204,255,0,0.15)] transition-colors hover:bg-lime-300 active:translate-y-px"
                  >
                    Create a video
                  </Link>
                </div>
              }
            />
          ) : (
            <p className="py-10 text-center text-sm text-ink-300">
              Nothing matches these filters.
            </p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onOpen={() => setOpenId(job.id)} />
            ))}
          </div>
        )}
      </div>

      {openJob && (
        <JobLightbox
          job={openJob}
          onClose={() => setOpenId(null)}
          onRerun={(next) => {
            setJobs((prev) =>
              prev ? [next, ...prev.filter((j) => j.id !== next.id)] : [next]
            );
            setTotal((t) => t + 1);
            setOpenId(null);
          }}
          onDeleted={(id) => {
            setJobs((prev) => (prev ? prev.filter((j) => j.id !== id) : prev));
            setTotal((t) => Math.max(0, t - 1));
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}
