"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clapperboard, Download, ImageIcon, Search, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
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
  { value: "1536x2048", label: "3:4 Portrait" },
  { value: "1152x2048", label: "9:16 Vertical" },
  { value: "1536x1536", label: "1:1 Square" },
  { value: "2048x1152", label: "16:9 Cinema" },
  { value: "2048x1536", label: "4:3 Editorial" },
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
        caption: prompt.trim() || "New Soul still rendered in Vyolab Studio.",
        hashtags: ["vyolab", "editorial", "aicreative"],
        mediaPaths: [assetPath],
      });
      setQueuedMsg("Queued for Postiz human approval.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not queue draft.");
    }
  }

  return (
    <div className="animate-rise">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">
            Soul Image Studio
          </h1>
          <span className="rounded-full border border-ink-800 bg-ink-900 px-2.5 py-0.5 font-mono text-[11px] text-ink-300">
            {catalogSource === "higgsfield_live"
              ? `${styles?.length ?? 0} live Soul styles`
              : "Editorial aesthetics · routed via Higgsfield / ComfyUI FLUX / HF"}
          </span>
        </div>

        <div className="relative w-56">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search aesthetics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-full pl-8 text-xs"
          />
        </div>
      </div>

      {/* Rendered Result Stage */}
      {job && (
        <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-900/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="font-mono text-xs text-ink-400">{shortId(job.id)}</span>
            {job.provider && (
              <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 font-mono text-[11px] text-lime-400">
                {job.provider}
              </span>
            )}
            <span className="ml-auto flex items-center gap-3 font-mono text-xs text-ink-300">
              <span>{elapsed}s</span>
              {job.estimatedCostUsd != null && <span>est. ${job.estimatedCostUsd.toFixed(2)}</span>}
              {job.cost != null && <span>{formatCredits(job.cost)} cr</span>}
            </span>
          </div>
          {decision && (
            <p className="mt-2 font-mono text-[11px] text-ink-400">{decision.reason}</p>
          )}
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
                  className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${asset.path}`}
                    alt="Generated still"
                    className="w-full object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-2 border-t border-ink-800 bg-ink-900/95 p-2.5">
                    <Link
                      href={`/create/video?image=${encodeURIComponent(`/api/assets/${asset.path}`)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-2.5 py-1.5 text-xs font-semibold text-ink-950 hover:bg-lime-300"
                    >
                      <Clapperboard className="size-3.5" aria-hidden />
                      Animate (I2V)
                    </Link>
                    <button
                      type="button"
                      onClick={() => void queueToPostiz(asset.path)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs text-ink-200 hover:border-ink-600"
                    >
                      <Send className="size-3" aria-hidden />
                      Publish
                    </button>
                    <a
                      href={`/api/assets/${asset.path}`}
                      download
                      className="ml-auto text-ink-300 hover:text-ink-50"
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
            <p className="mt-3 font-mono text-xs text-lime-400">
              {queuedMsg}{" "}
              <Link href="/publish" className="underline">
                Open Publish →
              </Link>
            </p>
          )}
          {job.error && <p className="mt-3 text-sm text-danger">{job.error}</p>}
        </section>
      )}

      {/* Full-Bleed Soul Aesthetic Grid */}
      <section aria-label="Aesthetics" className="mt-5">
        {styles === null ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-ink-900" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      {/* Floating Dark-Glass Bottom Image Prompt Dock */}
      <div className="fixed inset-x-3 bottom-16 z-30 mx-auto max-w-4xl lg:bottom-5">
        <div className="rounded-2xl border border-ink-700/90 bg-ink-900/92 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {selectedStyle?.preview_url && (
              <div className="relative hidden h-14 w-12 shrink-0 overflow-hidden rounded-xl border border-lime-400/60 sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedStyle.preview_url}
                  alt={selectedStyle.name}
                  className="size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center font-mono text-[8px] text-lime-400">
                  STYLE
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  selectedStyle
                    ? `Describe the shot in ${selectedStyle.name} style — subject, light, lens, mood...`
                    : "Describe the image — subject, light, lens, mood..."
                }
                className="w-full resize-none bg-transparent text-sm leading-snug text-ink-50 placeholder:text-ink-400 focus:outline-none"
              />
            </div>

            <Button
              size="lg"
              onClick={() => void submit()}
              disabled={!prompt.trim()}
              loading={submitting}
              className="shrink-0 rounded-xl px-6"
            >
              <ImageIcon className="size-4" aria-hidden />
              Generate
            </Button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-ink-800/80 pt-2.5 font-mono text-[11px]">
            <select
              aria-label="Provider route"
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderChoice)}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
            >
              <option value="auto">Auto · Model Router</option>
              <option value="higgsfield">Higgsfield Soul 2</option>
              <option value="comfyui">ComfyUI · FLUX ($0 GPU)</option>
              <option value="huggingface">HF Router · FLUX</option>
              <option value="local_motion">Local Cinema Plate ($0)</option>
            </select>

            <select
              aria-label="Aspect ratio"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setBatch((b) => (b === 1 ? 4 : 1))}
              className={cn(
                "rounded-lg border px-2.5 py-1 transition-colors",
                batch === 4
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-ink-700 bg-ink-950 text-ink-300"
              )}
            >
              {batch}× batch
            </button>

            {characters.length > 0 && (
              <select
                aria-label="Soul Character"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-ink-200 focus:border-lime-400 focus:outline-none"
              >
                <option value="">No Character</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Soul ID: {c.name}
                  </option>
                ))}
              </select>
            )}

            {selectedStyle && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-950 px-2.5 py-1 text-lime-400">
                <Sparkles className="size-3" aria-hidden />
                {selectedStyle.name}
              </span>
            )}

            {submitError && (
              <span className="ml-auto text-danger" role="alert">
                {submitError}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
