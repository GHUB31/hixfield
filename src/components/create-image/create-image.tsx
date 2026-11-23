"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clapperboard,
  Cpu,
  Download,
  Maximize2,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PresetCard } from "@/components/preset-card";
import { StyleCard } from "@/components/create-image/style-card";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import {
  isTerminalStatus,
  type CharacterRecord,
  type JobRecord,
  type RoutingDecision,
  type SoulStyle,
} from "@/lib/higgsfield/types";
import { cn, formatCredits, shortId } from "@/lib/utils";

type ProviderChoice = "auto" | "higgsfield" | "comfyui" | "huggingface" | "local_motion";

const SIZES: Array<{ value: string; label: string }> = [
  { value: "1536x2048", label: "3:4" },
  { value: "1152x2048", label: "9:16" },
  { value: "1536x1536", label: "1:1" },
  { value: "2048x1152", label: "16:9" },
  { value: "2048x1536", label: "4:3" },
];

function isVideoUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0].toLowerCase();
  return path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".mov");
}

export function CreateImage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1536x2048");
  const [batch, setBatch] = useState<1 | 4>(1);
  const [provider, setProvider] = useState<ProviderChoice>("auto");

  const [styles, setStyles] = useState<SoulStyle[] | null>(null);
  const [catalogSource, setCatalogSource] = useState<"higgsfield_live" | "local_preview" | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);

  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [characterId, setCharacterId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [queuedMsg, setQueuedMsg] = useState<string | null>(null);
  const [job, setJob] = useJobPoll(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promptParam = params.get("prompt");
    if (promptParam) setPrompt(promptParam);
  }, []);

  const loadStyles = useCallback(async () => {
    try {
      const data = await getJSON<{
        styles: SoulStyle[];
        source?: "higgsfield_live" | "local_preview";
      }>("/api/catalog/soul-styles");
      setStyles(data.styles);
      setCatalogSource(data.source ?? "higgsfield_live");
      if (data.styles.length > 0 && !styleId) {
        setStyleId(data.styles[0].id);
      }
    } catch {
      setStyles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadStyles();
  }, [loadStyles]);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("character");
    getJSON<{ characters: CharacterRecord[] }>("/api/characters")
      .then((data) => {
        const ready = data.characters.filter((c) => c.status === "completed");
        setCharacters(ready);
        if (wanted && ready.some((c) => c.id === wanted)) setCharacterId(wanted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!job) return;
    if (isTerminalStatus(job.status)) {
      setElapsed(Math.max(0, Math.round((job.updatedAt - job.createdAt) / 1000)));
      return;
    }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - job.createdAt) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [job]);

  const filteredStyles = useMemo(() => {
    if (!styles) return [];
    const q = search.trim().toLowerCase();
    if (!q) return styles;
    return styles.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)
    );
  }, [styles, search]);

  const selectedStyle = useMemo(
    () => styles?.find((s) => s.id === styleId) ?? null,
    [styles, styleId]
  );

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitError(null);
    setQueuedMsg(null);
    setSubmitting(true);

    try {
      const stylePrompt =
        selectedStyle && catalogSource === "local_preview"
          ? `${trimmed}. Aesthetic: ${selectedStyle.name} — ${selectedStyle.description ?? ""}`
          : trimmed;

      const body: Record<string, unknown> = {
        prompt: stylePrompt,
        width_and_height: size,
        quality: "1080p",
        batch_size: batch,
        provider,
      };
      if (styleId && catalogSource === "higgsfield_live") {
        body.style_id = styleId;
        body.style_strength = 1;
      }
      if (characterId) {
        body.custom_reference_id = characterId;
        body.custom_reference_strength = 1;
      }
      const res = await postJSON<{ job: JobRecord; routingDecision?: RoutingDecision }>(
        "/api/generate/soul",
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
        platform: "instagram",
        caption: prompt.trim() || "New Soul still rendered in EVIE-LABS.",
        hashtags: ["evielabs", "editorial", "aicreative"],
        mediaPaths: [assetPath],
      });
      setQueuedMsg("Queued for Postiz human approval.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not queue draft.");
    }
  }

  return (
    <>
      <div className="animate-rise pb-44">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-white">Image</h1>
            <span className="text-[12px] text-white/45">
              {catalogSource === "higgsfield_live"
                ? `${styles?.length ?? 0} live Soul styles`
                : "Soul Aesthetics · Higgsfield / ComfyUI FLUX / HF Router"}
            </span>
          </div>

          <div className="relative w-52">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search aesthetics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 text-[12px] text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
            />
          </div>
        </div>

        {/* Rendered Result Stage */}
        {job && (
          <section className="mt-5 rounded-2xl border border-white/[0.1] bg-[#0b0b0c] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={job.status} />
              <span className="font-mono text-[11px] text-white/45">{shortId(job.id)}</span>
              {job.provider && (
                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/80">
                  {job.provider}
                </span>
              )}
              <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-white/60">
                <span>{elapsed}s</span>
                {job.estimatedCostUsd != null && <span>${job.estimatedCostUsd.toFixed(2)}</span>}
                {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
              </span>
            </div>
            {decision && <p className="mt-2 text-[12px] text-white/50">{decision.reason}</p>}
            {job.status === "completed" && job.assets.length > 0 && (
              <div
                className={cn(
                  "mt-4 grid gap-4",
                  job.assets.length > 1 ? "grid-cols-2 lg:grid-cols-4" : "max-w-lg grid-cols-1"
                )}
              >
                {job.assets.map((asset) => (
                  <figure
                    key={asset.path}
                    className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/assets/${asset.path}`}
                      alt="Generated still"
                      className="w-full object-cover"
                    />
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] bg-[#0b0b0c] p-2.5">
                      <Link
                        href={`/create/video?image=${encodeURIComponent(`/api/assets/${asset.path}`)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#d1fe17] px-2.5 py-1.5 text-[12px] font-bold text-black hover:bg-[#dcff4a]"
                      >
                        <Clapperboard className="size-3.5" aria-hidden />
                        Animate
                      </Link>
                      <button
                        type="button"
                        onClick={() => void queueToPostiz(asset.path)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.12] cursor-pointer"
                      >
                        <Send className="size-3" aria-hidden />
                        Publish
                      </button>
                      <a
                        href={`/api/assets/${asset.path}`}
                        download
                        className="ml-auto text-white/60 hover:text-white"
                        aria-label="Download image"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  </figure>
                ))}
              </div>
            )}
            {queuedMsg && (
              <p className="mt-3 text-[12px] text-[#d1fe17]">
                {queuedMsg}{" "}
                <Link href="/publish" className="underline">
                  Open Publish →
                </Link>
              </p>
            )}
            {job.error && <p className="mt-3 text-[13px] text-danger">{job.error}</p>}
          </section>
        )}

        {/* Full-Bleed Soul Aesthetics Gallery */}
        <section aria-label="Aesthetics" className="mt-4">
          {styles === null ? (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              {filteredStyles.map((s) => {
                const selected = s.id === styleId;
                const toggle = () => setStyleId((cur) => (cur === s.id ? null : s.id));
                return s.preview_url && isVideoUrl(s.preview_url) ? (
                  <PresetCard
                    key={s.id}
                    name={s.name}
                    description={s.description}
                    previewUrl={s.preview_url}
                    category={s.category}
                    selected={selected}
                    onSelect={toggle}
                    aspect="aspect-[3/4]"
                  />
                ) : (
                  <StyleCard
                    key={s.id}
                    name={s.name}
                    description={s.description}
                    previewUrl={s.preview_url}
                    selected={selected}
                    onSelect={toggle}
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
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 pl-1">
              <div className="flex items-center gap-2.5">
                {selectedStyle?.preview_url && (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-[#d1fe17]/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedStyle.preview_url}
                      alt={selectedStyle.name}
                      className="size-full object-cover"
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    selectedStyle
                      ? `Describe any visual idea in ${selectedStyle.name} style.`
                      : "Describe any visual idea. We will generate an image."
                  }
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>

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
                    <option value="higgsfield" className="bg-[#141416]">Higgsfield Soul 2</option>
                    <option value="comfyui" className="bg-[#141416]">ComfyUI · FLUX ($0)</option>
                    <option value="huggingface" className="bg-[#141416]">HF Router · FLUX</option>
                    <option value="local_motion" className="bg-[#141416]">Local Plate ($0)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-3 text-white/45" />
                </label>

                <label className="relative inline-flex h-7 items-center gap-1 rounded-lg bg-white/[0.07] pl-2.5 pr-6 font-mono text-[11px] text-white/85 transition-colors hover:bg-white/[0.12]">
                  <Maximize2 className="size-3 text-white/45" aria-hidden />
                  <select
                    aria-label="Aspect ratio"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="appearance-none bg-transparent font-mono text-[11px] text-white focus:outline-none cursor-pointer"
                  >
                    {SIZES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-[#141416]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-3 text-white/45" />
                </label>

                <button
                  type="button"
                  onClick={() => setBatch((b) => (b === 1 ? 4 : 1))}
                  className={cn(
                    "inline-flex h-7 items-center rounded-lg px-2.5 font-mono text-[11px] transition-colors cursor-pointer",
                    batch === 4
                      ? "bg-white/[0.14] text-white"
                      : "bg-white/[0.07] text-white/75 hover:bg-white/[0.12]"
                  )}
                >
                  {batch}×
                </button>

                {characters.length > 0 && (
                  <label className="relative inline-flex h-7 items-center rounded-lg bg-white/[0.07] pl-2.5 pr-6 text-[12px] text-white/85">
                    <select
                      aria-label="Soul Character"
                      value={characterId}
                      onChange={(e) => setCharacterId(e.target.value)}
                      className="appearance-none bg-transparent text-[12px] text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#141416]">No Character</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#141416]">
                          Soul: {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 size-3 text-white/45" />
                  </label>
                )}

                {selectedStyle && (
                  <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/[0.07] px-2.5 text-[12px] font-medium text-white/90">
                    <Sparkles className="size-3 text-[#d1fe17]" aria-hidden />
                    {selectedStyle.name}
                  </span>
                )}

                {submitError && (
                  <span className="ml-auto text-[11px] text-danger" role="alert">
                    {submitError}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!prompt.trim() || submitting}
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
