"use client";

import { useEffect, useState } from "react";
import { AudioLines, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaUpload } from "@/components/media-upload";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import { isTerminalStatus, type JobRecord } from "@/lib/higgsfield/types";
import { formatCredits, shortId } from "@/lib/utils";

type Quality = "mid" | "high";
type Duration = 5 | 10 | 15;

const ACTIVE_COPY: Record<string, string> = {
  waiting: "Waiting for a free slot on your plan.",
  queued: "In the render queue.",
  in_progress: "Rendering your avatar.",
};

export function SpeakStudio() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<Quality>("mid");
  const [duration, setDuration] = useState<Duration>(5);

  const [submitting, setSubmitting] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);

  const [job, setJob] = useJobPoll(null);
  const active = job !== null && !isTerminalStatus(job.status);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const elapsed = job ? Math.max(0, Math.floor((now - job.createdAt) / 1000)) : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!imageUrl || !audioUrl || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setRerunError(null);
    setMissingKeys(false);
    try {
      const { job: created } = await postJSON<{ job: JobRecord }>("/api/generate/speak", {
        input_image_url: imageUrl,
        input_audio_url: audioUrl,
        prompt: prompt.trim(),
        quality,
        duration,
      });
      setJob(created);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setMissingKeys(true);
      } else {
        setSubmitError(err instanceof Error ? err.message : "The request failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRerun() {
    if (!job || rerunning) return;
    setRerunning(true);
    setRerunError(null);
    setMissingKeys(false);
    try {
      const { job: next } = await postJSON<{ job: JobRecord }>(`/api/jobs/${job.id}/rerun`, {});
      setJob(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setMissingKeys(true);
      } else {
        setRerunError(err instanceof Error ? err.message : "The rerun failed.");
      }
    } finally {
      setRerunning(false);
    }
  }

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Speak</h1>
        <p className="mt-1 text-sm text-ink-300">
          A portrait plus a voice track becomes a talking avatar.
        </p>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="animate-rise rise-1 flex flex-col gap-5 rounded-xl border border-ink-700 bg-ink-900 p-5 sm:p-6"
        >
          <MediaUpload
            label="Portrait"
            kind="image"
            value={imageUrl}
            onChange={setImageUrl}
            help="A clear front-facing face works best."
          />

          <MediaUpload
            label="Voice audio"
            kind="audio"
            value={audioUrl}
            onChange={setAudioUrl}
            help="MP3, M4A and friends convert to WAV automatically when ffmpeg is installed."
          />

          <Field label="Direction" htmlFor="speak-direction" help="Optional.">
            <Textarea
              id="speak-direction"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Calm, direct to camera"
              maxLength={2000}
              className="min-h-20"
            />
          </Field>

          <Field label="Quality" help="Mid renders faster, high looks best.">
            <Segmented<Quality>
              label="Quality"
              value={quality}
              onChange={setQuality}
              options={[
                { value: "mid", label: "Mid", hint: "Faster" },
                { value: "high", label: "High", hint: "Best" },
              ]}
              className="w-fit"
            />
          </Field>

          <Field label="Duration">
            <Segmented<Duration>
              label="Duration"
              value={duration}
              onChange={setDuration}
              options={[
                { value: 5, label: "5s" },
                { value: 10, label: "10s" },
                { value: 15, label: "15s" },
              ]}
              className="w-fit"
            />
          </Field>

          <div className="flex flex-col gap-2.5 pt-1">
            <Button type="submit" disabled={!imageUrl || !audioUrl} loading={submitting}>
              Generate avatar
            </Button>
            {missingKeys && (
              <p className="rounded-lg border border-amber/30 bg-amber/10 px-3.5 py-2.5 text-[13px] text-amber">
                Add your Higgsfield API key first. Instructions are in the banner above.
              </p>
            )}
            {submitError && <p className="text-[13px] text-danger">{submitError}</p>}
          </div>
        </form>

        <div className="animate-rise rise-2">
          {job === null ? (
            <EmptyState
              icon={<AudioLines />}
              title="Your avatar lands here"
              body="Add a portrait and a voice track to start."
            />
          ) : (
            <section
              aria-label="Generation result"
              className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={job.status} />
                <span className="font-mono text-[11px] text-ink-400">{shortId(job.id)}</span>
                {active && (
                  <span className="ml-auto font-mono text-[13px] text-ink-300">{elapsed}s</span>
                )}
                {!active && job.cost != null && (
                  <span className="ml-auto font-mono text-[13px] text-ink-300">
                    {formatCredits(job.cost)} cr
                  </span>
                )}
              </div>

              {active && (
                <>
                  <p className="text-sm text-ink-300">
                    {ACTIVE_COPY[job.status] ?? "Working on it."}
                  </p>
                  <div className="aspect-video w-full animate-pulse rounded-lg bg-ink-850" />
                </>
              )}

              {job.status === "completed" &&
                (job.assets.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {job.assets.map((asset) => (
                      <div key={asset.path} className="flex flex-col gap-2">
                        {asset.type === "video" ? (
                          <video
                            src={`/api/assets/${asset.path}`}
                            controls
                            playsInline
                            className="w-full rounded-lg"
                          />
                        ) : asset.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/assets/${asset.path}`}
                            alt="Generated avatar frame"
                            className="w-full rounded-lg"
                          />
                        ) : (
                          <audio controls src={`/api/assets/${asset.path}`} className="w-full" />
                        )}
                        <a
                          href={`/api/assets/${asset.path}`}
                          download
                          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-300 transition-colors hover:text-ink-50"
                        >
                          <Download className="size-3.5" aria-hidden />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-300">The job finished but returned no files.</p>
                ))}

              {(job.status === "failed" || job.status === "nsfw") && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-danger">{job.error ?? "The job failed."}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRerun}
                    loading={rerunning}
                    className="w-fit"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Try again
                  </Button>
                  {rerunError && <p className="text-[13px] text-danger">{rerunError}</p>}
                </div>
              )}

              {job.status === "canceled" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-ink-300">This job was canceled.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRerun}
                    loading={rerunning}
                    className="w-fit"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Try again
                  </Button>
                  {rerunError && <p className="text-[13px] text-danger">{rerunError}</p>}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
