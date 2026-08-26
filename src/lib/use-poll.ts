"use client";

import { useEffect, useState } from "react";
import { getJSON } from "@/lib/fetcher";
import { isTerminalStatus, type JobRecord } from "@/lib/higgsfield/types";

/**
 * Polls a job every 2 seconds until it lands in a terminal state.
 * The server sync it triggers also downloads finished outputs to disk.
 */
export function useJobPoll(
  initial: JobRecord | null
): [JobRecord | null, (job: JobRecord | null) => void] {
  const [job, setJob] = useState<JobRecord | null>(initial);

  const id = job?.id;
  const status = job?.status;

  useEffect(() => {
    if (!id || !status || isTerminalStatus(status)) return;
    const timer = setInterval(async () => {
      try {
        const { job: next } = await getJSON<{ job: JobRecord | null }>(`/api/jobs/${id}`);
        if (next) setJob(next);
      } catch {
        // transient — the next tick retries
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [id, status]);

  return [job, setJob];
}
