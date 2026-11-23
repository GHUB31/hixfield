"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clock,
  Cpu,
  Download,
  Plus,
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

  // Higgsfield-exact floating prompt bar state
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imgParam = params.get("image");
    const promptParam = params.get("prompt");
    if (imgParam) setImageUrl(imgParam);
    if (promptParam) setPrompt(promptParam);
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
      const fullPrompt =
        prompt.trim() || (motionHint ? `${motionHint} camera motion` : "Slow cinematic push in");
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
        caption: prompt.trim() || "New cinema cut rendered in EVIE-LABS.",
        hashtags: ["evielabs", "aivideo", "cinema"],
        mediaPaths: [assetPath],
      });
      setQueuedNotice("Queued for Postiz human approval.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not queue draft.");
    }
  }

  const active = job !== null && !isTerminalStatus(job.status);

  return (
    <>
      <div className="animate-rise pb-44">
        {/* Clean Higgsfield-style top filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-white">Video</h1>
            <div className="flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer",
                    category === cat
                      ? "bg-white text-black"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-white/40 md:inline">
              {catalogSource === "higgsfield_live"
                ? `${motions?.length ?? 0} live DoP motions`
                : "Local cinema rig · connect HF key for 50+ live motions"}
            </span>
            <div className="relative w-52">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search motions"
                className="h-9 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 text-[12px] text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Active Result Cinema Stage */}
        {job && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b0b0c] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={job.status} />
              <span className="font-mono text-[11px] text-white/45">{shortId(job.id)}</span>
              {job.provider && (
                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/80">
                  {job.provider}
                </span>
              )}
              <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-white/60">
                {active && <span>{elapsed}s</span>}
                {job.estimatedCostUsd != null && <span>${job.estimatedCostUsd.toFixed(2)}</span>}
                {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
              </span>
            </div>
            {decision && <p className="mt-2 text-[12px] text-white/50">{decision.reason}</p>}
            {job.status === "completed" && job.assets[0] && (
              <div className="mt-4 grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <video
                    src={`/api/assets/${job.assets[0].path}`}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[440px] w-full rounded-xl bg-black object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2.5 lg:col-span-4">
                  <a
                    href={`/api/assets/${job.assets[0].path}`}
                    download
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    <Download className="size-4" aria-hidden />
                    Download MP4
                  </a>
                  <Button
                    variant="secondary"
                    onClick={() => void queueToPostiz(job.assets[0].path)}
                  >
                    <Send className="size-3.5" aria-hidden />
                    Queue for Postiz Approval
                  </Button>
                  {queuedNotice && (
                    <p className="text-[12px] text-[#d1fe17]">
                      {queuedNotice}{" "}
                      <Link href="/publish" className="underline">
                        Open Publish →
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            )}
            {job.error && <p className="mt-3 text-[13px] text-danger">{job.error}</p>}
          </section>
        )}

        {/* Active Camera Rig Strip (clean minimal bar) */}
        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {selected.map((s, i) => (
              <div
                key={s.motion.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5"
              >
                <span className="grid size-5 place-items-center rounded bg-[#d1fe17] text-[11px] font-extrabold text-black">
                  {i === 0 ? "A" : "B"}
                </span>
                <span className="text-[12px] font-medium text-white">{s.motion.name}</span>
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
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {limitHint && (
              <span className="text-[12px] text-amber">Max 2 camera moves stacked</span>
            )}
          </div>
        )}

        {/* Edge-to-Edge 4-Column Cinema Motion Gallery */}
        <section aria-label="Camera motion presets" className="mt-4">
          {motions === null ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Exact Higgsfield Floating Bottom Prompt Slab */}
      <div className="fixed inset-x-3 bottom-16 z-30 mx-auto max-w-[780px] lg:bottom-5">
        <div className="rounded-[20px] border border-white/[0.11] bg-[#141416]/95 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.92)] backdrop-blur-2xl">
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

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 pl-1">
              {/* Top row: frame thumbnails + prompt input */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => startInputRef.current?.click()}
                  title="Upload start frame"
                  className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.06] transition-colors hover:border-[#d1fe17] cursor-pointer"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Start frame" className="size-full object-cover" />
                  ) : (
                    <Plus className="mx-auto size-4 text-white/70" />
                  )}
                  {uploadingSlot === "start" && (
                    <span className="absolute inset-0 grid place-items-center bg-black/70 text-[9px] text-white">
                      ...
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => endInputRef.current?.click()}
                  title="Optional end frame"
                  className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-white/[0.14] bg-white/[0.04] text-white/50 transition-colors hover:border-white/30 hover:text-white cursor-pointer"
                >
                  {endImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={endImageUrl} alt="End frame" className="size-full object-cover" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </button>

                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe any visual idea. We will generate a video."
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>

              {/* Bottom row: sleek dark pill controls (no native OS arrows) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="relative inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.07] pl-2.5 pr-6 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/[0.12]">
                  <Cpu className="size-3 text-[#d1fe17]" aria-hidden />
                  <select
                    aria-label="Provider route"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ProviderChoice)}
                    className="appearance-none bg-transparent text-[12px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="auto" className="bg-[#141416]">Auto · Model Router</option>
                    <option value="higgsfield" className="bg-[#141416]">Higgsfield DoP</option>
                    <option value="comfyui" className="bg-[#141416]">ComfyUI · Wan 2.2 ($0)</option>
                    <option value="huggingface" className="bg-[#141416]">HF Router · Wan 2.2</option>
                    <option value="local_motion" className="bg-[#141416]">FFmpeg 2D ($0)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-3 text-white/45" />
                </label>

                <label className="relative inline-flex h-7 items-center rounded-lg bg-white/[0.07] pl-2.5 pr-6 text-[12px] font-medium text-white/85 transition-colors hover:bg-white/[0.12]">
                  <select
                    aria-label="DoP tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as Tier)}
                    className="appearance-none bg-transparent text-[12px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="lite" className="bg-[#141416]">DoP Lite</option>
                    <option value="standard" className="bg-[#141416]">DoP Standard</option>
                    <option value="turbo" className="bg-[#141416]">DoP Turbo</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-3 text-white/45" />
                </label>

                <button
                  type="button"
                  onClick={() => setDuration((d) => (d === 2 ? 3 : d === 3 ? 5 : 2))}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/[0.07] px-2.5 font-mono text-[11px] text-white/85 transition-colors hover:bg-white/[0.12] cursor-pointer"
                >
                  <Clock className="size-3 text-white/45" aria-hidden />
                  {duration}s
                </button>

                <button
                  type="button"
                  onClick={() => setEnhance((v) => !v)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium transition-colors cursor-pointer",
                    enhance
                      ? "bg-white/[0.12] text-white"
                      : "bg-white/[0.05] text-white/45"
                  )}
                >
                  <Sparkles className="size-3 text-[#d1fe17]" aria-hidden />
                  Enhance {enhance ? "On" : "Off"}
                </button>

                {submitError && (
                  <span className="ml-auto text-[11px] text-danger" role="alert">
                    {submitError}
                  </span>
                )}
              </div>
            </div>

            {/* Full-height iconic Acid Lime GENERATE block */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!imageUrl || submitting}
              className="flex min-h-[72px] shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#d1fe17] px-7 text-[12px] font-extrabold tracking-[0.06em] text-black uppercase transition-all hover:bg-[#dcff4a] active:scale-[0.99] disabled:bg-white/[0.08] disabled:text-white/30 cursor-pointer"
            >
              {submitting && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              )}
              GENERATE
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
