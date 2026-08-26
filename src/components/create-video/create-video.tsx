"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Clapperboard, X } from "lucide-react";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import { isTerminalStatus, type JobRecord, type Motion } from "@/lib/higgsfield/types";
import { formatCredits, shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/media-upload";
import { StatusBadge } from "@/components/status-badge";
import { MotionGallery } from "@/components/create-video/motion-gallery";

type Tier = "lite" | "standard" | "turbo";

const TIERS: Array<{ value: Tier; label: string; hint: string }> = [
  { value: "lite", label: "Lite", hint: "Cheapest" },
  { value: "standard", label: "Standard", hint: "Best quality" },
  { value: "turbo", label: "Turbo", hint: "Fastest" },
];

interface SelectedMotion {
  motion: Motion;
  strength: number;
}

/** Seconds since the job was created, ticking while it is still running. */
function useElapsed(job: JobRecord | null): number {
  const [now, setNow] = useState(() => Date.now());
  const active = job !== null && !isTerminalStatus(job.status);
  const jobId = job?.id;

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, jobId]);

  if (!job) return 0;
  const end = active ? now : job.updatedAt;
  return Math.max(0, Math.floor((end - job.createdAt) / 1000));
}

export function CreateVideo() {
  // Motion catalog
  const [motions, setMotions] = useState<Motion[] | null>(null);
  const [catalogError, setCatalogError] = useState<{ message: string; code?: string } | null>(null);

  const loadMotions = useCallback(async () => {
    setCatalogError(null);
    setMotions(null);
    try {
      const data = await getJSON<{ motions: Motion[] }>("/api/catalog/motions");
      setMotions(data.motions);
    } catch (err) {
      if (err instanceof ApiError) {
        setCatalogError({ message: err.message, code: err.code });
      } else {
        setCatalogError({
          message: err instanceof Error ? err.message : "The motion catalog failed to load.",
        });
      }
    }
  }, []);

  useEffect(() => {
    void loadMotions();
  }, [loadMotions]);

  // Selection (A then B, two at most)
  const [selected, setSelected] = useState<SelectedMotion[]>([]);
  const [limitHint, setLimitHint] = useState(false);

  function toggleMotion(motion: Motion) {
    const already = selected.some((s) => s.motion.id === motion.id);
    if (already) {
      setSelected(selected.filter((s) => s.motion.id !== motion.id));
      setLimitHint(false);
    } else if (selected.length >= 2) {
      setLimitHint(true);
    } else {
      setSelected([...selected, { motion, strength: 0.8 }]);
      setLimitHint(false);
    }
  }

  function setStrength(id: string, strength: number) {
    setSelected((prev) => prev.map((s) => (s.motion.id === id ? { ...s, strength } : s)));
  }

  // Form
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [endImageUrl, setEndImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<Tier>("standard");
  // The API's own default is true — the toggle starts where the API starts.
  const [enhance, setEnhance] = useState(true);
  const [seed, setSeed] = useState("");
  const promptId = useId();
  const seedId = useId();

  // Submission and the job it produces
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [job, setJob] = useJobPoll(null);
  const elapsed = useElapsed(job);

  async function handleSubmit() {
    if (!imageUrl || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setRerunError(null);
    setMissingKeys(false);
    try {
      const body: Record<string, unknown> = {
        tier,
        image_url: imageUrl,
        motions: selected.map((s) => ({ id: s.motion.id, strength: s.strength })),
        enhance_prompt: enhance,
      };
      if (prompt.trim()) body.prompt = prompt.trim();
      if (endImageUrl) body.end_image_url = endImageUrl;
      if (seed.trim() !== "") body.seed = Number(seed);
      const { job: created } = await postJSON<{ job: JobRecord }>("/api/generate/dop", body);
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
    try {
      const { job: next } = await postJSON<{ job: JobRecord }>(`/api/jobs/${job.id}/rerun`, {});
      setJob(next);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : "The rerun failed.");
    } finally {
      setRerunning(false);
    }
  }

  const active = job !== null && !isTerminalStatus(job.status);
  const activeTier = TIERS.find((t) => t.value === tier);

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create video</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Pick up to two camera moves, set a first frame, and direct the shot.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Gallery column: the visual lead. First on mobile, right on desktop. */}
        <section
          aria-label="Camera moves"
          className="animate-rise rise-1 order-1 flex flex-col gap-3 lg:order-2 lg:col-span-7"
        >
          {selected.length === 0 ? (
            /* Keyless or nothing picked yet: the stack rig stays visible, just unarmed. */
            <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
              <div className="flex flex-col gap-3 opacity-60" aria-hidden>
                {(["A", "B"] as const).map((slot) => (
                  <div key={slot} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-850 font-mono text-xs text-ink-400">
                      {slot}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Slider
                        value={0.8}
                        onChange={() => {}}
                        label="Strength"
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-ink-400">Stack up to two camera moves</p>
            </div>
          ) : (
            <div className="sticky top-3 z-10 rounded-xl border border-ink-700 bg-ink-900/95 p-3 backdrop-blur">
              <div className="flex flex-col gap-3">
                {selected.map((s, i) => (
                  <div key={s.motion.id} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-lime-400 font-mono text-xs font-bold text-ink-950"
                      aria-hidden
                    >
                      {i === 0 ? "A" : "B"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-medium text-ink-50">{s.motion.name}</p>
                        {s.motion.start_end_frame && (
                          <span className="whitespace-nowrap text-[11px] text-ink-400">
                            supports a last frame
                          </span>
                        )}
                      </div>
                      <Slider
                        value={s.strength}
                        onChange={(v) => setStrength(s.motion.id, v)}
                        label="Strength"
                        className="mt-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMotion(s.motion)}
                      aria-label={`Remove ${s.motion.name}`}
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MotionGallery
            motions={motions}
            loading={motions === null && catalogError === null}
            error={catalogError}
            onRetry={() => void loadMotions()}
            selection={selected.map((s) => s.motion)}
            onToggle={toggleMotion}
            limitHint={limitHint}
          />
        </section>

        {/* Form and result column */}
        <div className="animate-rise rise-2 order-2 flex flex-col gap-6 lg:order-1 lg:col-span-5">
          <section
            aria-label="Shot setup"
            className="flex flex-col gap-5 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5"
          >
            <MediaUpload label="First frame" kind="image" value={imageUrl} onChange={setImageUrl} />
            <MediaUpload
              label="Last frame (optional)"
              kind="image"
              value={endImageUrl}
              onChange={setEndImageUrl}
              help="Motions marked in the panel can end on this frame."
            />

            <Field label="Prompt (optional)" htmlFor={promptId}>
              <Textarea
                id={promptId}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Slow push in on the subject, shallow focus, warm practical light from the window"
                maxLength={2000}
              />
            </Field>

            <Field label="Tier">
              <Segmented<Tier> options={TIERS} value={tier} onChange={setTier} label="Tier" />
              {activeTier && <p className="mt-1.5 text-[13px] text-ink-400">{activeTier.hint}</p>}
            </Field>

            <Switch checked={enhance} onChange={setEnhance} label="Enhance prompt" />

            <Field label="Seed (optional)" htmlFor={seedId} help="Same seed, same shot.">
              <Input
                id={seedId}
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                className="font-mono"
                placeholder="Random"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </Field>

            <div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => void handleSubmit()}
                disabled={!imageUrl}
                loading={submitting}
              >
                Generate video
              </Button>
              {missingKeys && (
                <p className="mt-3 text-sm text-amber" role="status">
                  Add your Higgsfield API key first, instructions are in the banner above.
                </p>
              )}
              {submitError && (
                <p className="mt-3 text-sm text-danger" role="alert">
                  {submitError}
                </p>
              )}
            </div>
          </section>

          <section aria-label="Result">
            {!job ? (
              <EmptyState
                icon={<Clapperboard aria-hidden />}
                title="No video yet"
                body="Add an image, choose up to two camera moves, get your shot."
              />
            ) : (
              <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <StatusBadge status={job.status} />
                  <span className="font-mono text-xs text-ink-400">{shortId(job.id)}</span>
                  <span className="ml-auto flex items-center gap-3">
                    {active && <span className="font-mono text-xs text-ink-300">{elapsed}s</span>}
                    {job.cost != null && (
                      <span className="font-mono text-xs text-ink-300">
                        {formatCredits(job.cost)} cr
                      </span>
                    )}
                  </span>
                </div>

                {job.status === "waiting" && (
                  <p className="mt-3 text-sm text-ink-300">Waiting for a free slot on your plan.</p>
                )}
                {job.status === "queued" && (
                  <p className="mt-3 text-sm text-ink-300">Queued on Higgsfield.</p>
                )}
                {job.status === "in_progress" && (
                  <p className="mt-3 text-sm text-ink-300">Rendering your shot.</p>
                )}

                {job.status === "completed" && (
                  <div className="mt-4 flex flex-col gap-4">
                    {job.assets.map((asset) => (
                      <div key={asset.path}>
                        {asset.type === "video" ? (
                          <video
                            src={`/api/assets/${asset.path}`}
                            controls
                            loop
                            playsInline
                            className="w-full rounded-lg"
                          />
                        ) : asset.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/assets/${asset.path}`}
                            alt="Generated frame"
                            className="w-full rounded-lg"
                          />
                        ) : (
                          <audio controls src={`/api/assets/${asset.path}`} className="w-full" />
                        )}
                        <a
                          href={`/api/assets/${asset.path}`}
                          download
                          className="mt-2 inline-block text-sm text-lime-400 underline decoration-lime-400/40 underline-offset-2 transition-colors hover:decoration-lime-400"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                    {job.assets.length === 0 && (
                      <p className="text-sm text-ink-300">
                        The job finished but returned no files. Try running it again.
                      </p>
                    )}
                  </div>
                )}

                {(job.status === "failed" || job.status === "nsfw") && (
                  <div className="mt-3">
                    {job.error && <p className="text-sm text-danger">{job.error}</p>}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => void handleRerun()}
                      loading={rerunning}
                    >
                      Try again
                    </Button>
                  </div>
                )}

                {job.status === "canceled" && (
                  <div className="mt-3">
                    <p className="text-sm text-ink-300">This job was canceled.</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => void handleRerun()}
                      loading={rerunning}
                    >
                      Run again
                    </Button>
                  </div>
                )}

                {rerunError && (
                  <p className="mt-3 text-sm text-danger" role="alert">
                    {rerunError}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
