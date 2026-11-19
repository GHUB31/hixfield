"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Download,
  ImagePlus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import {
  isTerminalStatus,
  type JobRecord,
  type Motion,
  type RoutingDecision,
} from "@/lib/higgsfield/types";
import { cn, formatCredits, shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { PresetCard } from "@/components/preset-card";
import { StatusBadge } from "@/components/status-badge";

type Tier = "lite" | "standard" | "turbo";
type ProviderChoice = "auto" | "higgsfield" | "comfyui" | "huggingface" | "local_motion";

interface SelectedMotion {
  motion: Motion;
  strength: number;
}

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
  const [motions, setMotions] = useState<Motion[] | null>(null);
  const [catalogSource, setCatalogSource] = useState<"higgsfield_live" | "local_preview" | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<SelectedMotion[]>([]);
  const [limitHint, setLimitHint] = useState(false);

  // Floating dock composer state
  const [imageUrl, setImageUrl] = useState<string | null>("/media/hero-soundstage.webp");
  const [endImageUrl, setEndImageUrl] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<"start" | "end" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<Tier>("standard");
  const [duration, setDuration] = useState<number>(3);
  const [provider, setProvider] = useState<ProviderChoice>("auto");
  const [enhance, setEnhance] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [job, setJob] = useJobPoll(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const elapsed = useElapsed(job);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Support deep-linking from Image or Library (?image=...)
  useEffect(() => {
    const imgParam = new URLSearchParams(window.location.search).get("image");
    if (imgParam) setImageUrl(imgParam);
  }, []);

  const loadMotions = useCallback(async () => {
    try {
      const data = await getJSON<{
        motions: Motion[];
        source?: "higgsfield_live" | "local_preview";
      }>("/api/catalog/motions");
      setMotions(data.motions);
      setCatalogSource(data.source ?? "higgsfield_live");
      if (data.motions.length > 0 && selected.length === 0) {
        setSelected([{ motion: data.motions[0], strength: 0.8 }]);
      }
    } catch {
      setMotions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMotions();
  }, [loadMotions]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const m of motions ?? []) {
      if (m.category) set.add(m.category);
    }
    return Array.from(set);
  }, [motions]);

  const filteredMotions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (motions ?? []).filter((m) => {
      if (category !== "All" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [motions, query, category]);

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

  async function uploadFrame(file: File, slot: "start" | "end") {
    setUploadingSlot(slot);
    setSubmitError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "image");
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) throw new Error(data.message ?? "Upload failed");
      if (slot === "start") setImageUrl(data.url);
      else setEndImageUrl(data.url);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleSubmit() {
    if (!imageUrl || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setQueuedNotice(null);
    try {
      const motionHint = selected.map((s) => s.motion.name).join(", ");
      const fullPrompt = prompt.trim() || (motionHint ? `${motionHint} camera motion` : "Slow cinematic push in");
      const body: Record<string, unknown> = {
        tier,
        provider,
        duration,
        image_url: imageUrl,
        prompt: fullPrompt,
        motions:
          catalogSource === "higgsfield_live"
            ? selected.map((s) => ({ id: s.motion.id, strength: s.strength }))
            : [],
        enhance_prompt: enhance,
      };
      if (endImageUrl) body.end_image_url = endImageUrl;
      const res = await postJSON<{ job: JobRecord; routingDecision?: RoutingDecision }>(
        "/api/generate/dop",
        body
      );
      setJob(res.job);
      setDecision(res.routingDecision ?? res.job.routingDecision ?? null);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function queueToPostiz(assetPath: string) {
    try {
      await postJSON("/api/publish", {
        jobId: job?.id ?? null,
        platform: "tiktok",
        caption: prompt.trim() || "New cinema cut rendered in Vyolab Studio.",
        hashtags: ["vyolab", "aivideo", "cinema"],
        mediaPaths: [assetPath],
      });
      setQueuedNotice("Added to Publish approval queue (pending_approval).");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not queue draft.");
    }
  }

  const active = job !== null && !isTerminalStatus(job.status);

  return (
    <>
    <div className="animate-rise pb-44">
      {/* Top Cinema Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">
            Camera Motion Studio
          </h1>
          <span className="rounded-full border border-ink-800 bg-ink-900 px-2.5 py-0.5 font-mono text-[11px] text-ink-300">
            {catalogSource === "higgsfield_live"
              ? `${motions?.length ?? 0} live DoP motions`
              : "Cinema preview rig · add HF keys for 50+ live motions"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900 p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  category === cat
                    ? "bg-ink-800 font-medium text-lime-400"
                    : "text-ink-400 hover:text-ink-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-52">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search motions..."
              className="h-9 rounded-full pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Live Cinema Monitor (appears seamlessly once a render is triggered) */}
      {job && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="font-mono text-xs text-ink-400">{shortId(job.id)}</span>
            {job.provider && (
              <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 font-mono text-[11px] text-lime-400">
                {job.provider}
              </span>
            )}
            <span className="ml-auto flex items-center gap-3 font-mono text-xs text-ink-300">
              {active && <span>{elapsed}s</span>}
              {job.estimatedCostUsd != null && <span>est. ${job.estimatedCostUsd.toFixed(2)}</span>}
              {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
            </span>
          </div>
          {decision && (
            <p className="mt-2 font-mono text-[11px] text-ink-400">{decision.reason}</p>
          )}
          {job.status === "completed" && job.assets[0] && (
            <div className="mt-4 grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <video
                  src={`/api/assets/${job.assets[0].path}`}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[440px] w-full rounded-xl border border-ink-700 bg-ink-950 object-contain"
                />
              </div>
              <div className="flex flex-col gap-2.5 lg:col-span-4">
                <a
                  href={`/api/assets/${job.assets[0].path}`}
                  download
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-800 px-4 text-sm font-medium text-ink-50 transition-colors hover:border-ink-600"
                >
                  <Download className="size-4" aria-hidden />
                  Download MP4
                </a>
                <Button
                  variant="secondary"
                  onClick={() => void queueToPostiz(job.assets[0].path)}
                >
                  <Send className="size-4" aria-hidden />
                  Queue for Postiz Approval
                </Button>
                {queuedNotice && (
                  <p className="font-mono text-xs text-lime-400">
                    {queuedNotice}{" "}
                    <Link href="/publish" className="underline">
                      Open Publish →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}
          {job.error && <p className="mt-3 text-sm text-danger">{job.error}</p>}
        </section>
      )}

      {/* Selected Motion Stack Strip (compact cinema rig bar) */}
      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/70 px-3.5 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
            Active Rig
          </span>
          {selected.map((s, i) => (
            <div
              key={s.motion.id}
              className="flex items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-950/90 px-2.5 py-1.5"
            >
              <span className="grid size-5 place-items-center rounded bg-lime-400 font-mono text-[11px] font-bold text-ink-950">
                {i === 0 ? "A" : "B"}
              </span>
              <span className="text-xs font-medium text-ink-100">{s.motion.name}</span>
              <div className="w-24">
                <Slider
                  value={s.strength}
                  onChange={(v) => setStrength(s.motion.id, v)}
                  label="Strength"
                />
              </div>
              <button
                type="button"
                onClick={() => toggleMotion(s.motion)}
                aria-label={`Remove ${s.motion.name}`}
                className="text-ink-400 hover:text-ink-50"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {limitHint && (
            <span className="font-mono text-[11px] text-amber">Max 2 camera moves stacked</span>
          )}
        </div>
      )}

      {/* Edge-to-Edge Full-Bleed Cinema Motion Gallery */}
      <section aria-label="Camera motion presets" className="mt-5">
        {motions === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl bg-ink-900" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredMotions.map((m) => {
              const idx = selected.findIndex((s) => s.motion.id === m.id);
              const tag = idx === 0 ? "A" : idx === 1 ? "B" : undefined;
              return (
                <PresetCard
                  key={m.id}
                  name={m.name}
                  description={m.description}
                  previewUrl={m.preview_url}
                  posterUrl={m.poster_url}
                  category={m.category}
                  selected={tag !== undefined}
                  selectionTag={tag}
                  onSelect={() => toggleMotion(m)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>

      {/* Higgsfield-style Floating Bottom Dark-Glass Prompt & Camera Dock */}
      <div className="fixed inset-x-3 bottom-16 z-30 mx-auto max-w-4xl lg:bottom-5">
        <div className="rounded-2xl border border-ink-700/90 bg-ink-900/92 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <input
            ref={startInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFrame(f, "start");
            }}
          />
          <input
            ref={endInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFrame(f, "end");
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Start / End Frame visual chips */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => startInputRef.current?.click()}
                title="Upload start frame"
                className="group relative h-14 w-20 overflow-hidden rounded-xl border border-ink-700 bg-ink-950 transition-colors hover:border-lime-400"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Start frame" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-ink-400">
                    <ImagePlus className="size-4" />
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center font-mono text-[9px] text-ink-200">
                  {uploadingSlot === "start" ? "..." : "START"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => endInputRef.current?.click()}
                title="Upload optional end frame"
                className="group relative h-14 w-16 overflow-hidden rounded-xl border border-dashed border-ink-700 bg-ink-950/70 transition-colors hover:border-ink-500"
              >
                {endImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={endImageUrl} alt="End frame" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-ink-400">
                    <ImagePlus className="size-3.5" />
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center font-mono text-[9px] text-ink-400">
                  {uploadingSlot === "end" ? "..." : "END"}
                </span>
              </button>
            </div>

            {/* Prompt input */}
            <div className="min-w-0 flex-1">
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Direct the shot — camera move, lens, lighting, motion intensity..."
                className="w-full resize-none bg-transparent text-sm leading-snug text-ink-50 placeholder:text-ink-400 focus:outline-none"
              />
            </div>

            {/* Primary Signal Lime Generate CTA */}
            <Button
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={!imageUrl}
              loading={submitting}
              className="shrink-0 rounded-xl px-6"
            >
              <Clapperboard className="size-4" aria-hidden />
              Generate
            </Button>
          </div>

          {/* Bottom compact pill controls */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-ink-800/80 pt-2.5 font-mono text-[11px]">
            <select
              aria-label="Provider route"
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderChoice)}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
            >
              <option value="auto">Auto · Model Router</option>
              <option value="higgsfield">Higgsfield DoP</option>
              <option value="comfyui">ComfyUI · Wan 2.2 ($0 GPU)</option>
              <option value="huggingface">HF Router · Wan 2.2</option>
              <option value="local_motion">Local FFmpeg 2D ($0)</option>
            </select>

            <select
              aria-label="DoP tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
            >
              <option value="lite">DoP Lite</option>
              <option value="standard">DoP Standard</option>
              <option value="turbo">DoP Turbo</option>
            </select>

            <select
              aria-label="Duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
            >
              <option value={2}>2s</option>
              <option value={3}>3s</option>
              <option value={5}>5s</option>
            </select>

            <button
              type="button"
              onClick={() => setEnhance((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors",
                enhance
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-ink-700 bg-ink-950 text-ink-400"
              )}
            >
              <Sparkles className="size-3" aria-hidden />
              Enhance {enhance ? "ON" : "OFF"}
            </button>

            {submitError && (
              <span className="ml-auto text-danger" role="alert">
                {submitError}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
