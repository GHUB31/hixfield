"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ImageIcon, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { PresetCard } from "@/components/preset-card";
import { StyleCard } from "@/components/create-image/style-card";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import {
  isTerminalStatus,
  type CharacterRecord,
  type JobRecord,
  type SoulStyle,
} from "@/lib/higgsfield/types";
import { cn, formatCredits, shortId } from "@/lib/utils";

/** The 13 Soul resolutions, grouped by shape so the list reads as a menu of framings. */
const SIZES: Array<{ value: string; label: string }> = [
  { value: "2048x1152", label: "2048 × 1152 · wide 16:9" },
  { value: "1696x960", label: "1696 × 960 · wide 16:9" },
  { value: "2048x1536", label: "2048 × 1536 · landscape 4:3" },
  { value: "1536x1152", label: "1536 × 1152 · landscape 4:3" },
  { value: "2016x1344", label: "2016 × 1344 · landscape 3:2" },
  { value: "1632x1088", label: "1632 × 1088 · landscape 3:2" },
  { value: "1536x1536", label: "1536 × 1536 · square 1:1" },
  { value: "1536x2048", label: "1536 × 2048 · portrait 3:4" },
  { value: "1152x1536", label: "1152 × 1536 · portrait 3:4" },
  { value: "1344x2016", label: "1344 × 2016 · portrait 2:3" },
  { value: "1088x1632", label: "1088 × 1632 · portrait 2:3" },
  { value: "1152x2048", label: "1152 × 2048 · tall 9:16" },
  { value: "960x1696", label: "960 × 1696 · tall 9:16" },
];

const BATCHES: Array<{ value: 1 | 4; label: string }> = [
  { value: 1, label: "1" },
  { value: 4, label: "4" },
];

function isVideoUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0].toLowerCase();
  return path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".mov");
}

function activeCopy(status: string): string {
  if (status === "waiting") return "Waiting for a free slot on your plan.";
  if (status === "queued") return "Queued on Higgsfield.";
  return "Rendering now. This usually takes under a minute.";
}

export function CreateImage() {
  // Prompt bar state
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1536x2048");
  const [quality, setQuality] = useState<"720p" | "1080p">("1080p");
  const [batch, setBatch] = useState<1 | 4>(1);
  const [seed, setSeed] = useState("");

  // Style gallery state
  const [styles, setStyles] = useState<SoulStyle[] | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [stylesMissingKeys, setStylesMissingKeys] = useState(false);
  const [search, setSearch] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState(1);

  // Character state
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [characterStrength, setCharacterStrength] = useState(1);

  // Submission and job state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMissingKeys, setSubmitMissingKeys] = useState(false);
  const [job, setJob] = useJobPoll(null);
  const [elapsed, setElapsed] = useState(0);

  const loadStyles = useCallback(async () => {
    setStyles(null);
    setStylesError(null);
    setStylesMissingKeys(false);
    try {
      const data = await getJSON<{ styles: SoulStyle[] }>("/api/catalog/soul-styles");
      setStyles(data.styles);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setStylesMissingKeys(true);
      } else {
        setStylesError(err instanceof Error ? err.message : "The style catalog did not load.");
      }
    }
  }, []);

  useEffect(() => {
    loadStyles();
  }, [loadStyles]);

  // Ready characters, with ?character=<id> preselected when present.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("character");
    getJSON<{ characters: CharacterRecord[] }>("/api/characters")
      .then((data) => {
        const ready = data.characters.filter((c) => c.status === "completed");
        setCharacters(ready);
        if (wanted && ready.some((c) => c.id === wanted)) setCharacterId(wanted);
      })
      .catch(() => {
        // No characters section without data; the page works fine without it.
      });
  }, []);

  // Honest elapsed clock: ticks while the job runs, freezes at the real duration.
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
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
    );
  }, [styles, search]);

  const selectedStyle = useMemo(
    () => styles?.find((s) => s.id === styleId) ?? null,
    [styles, styleId]
  );

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitError(null);
    setSubmitMissingKeys(false);

    const body: Record<string, unknown> = {
      prompt: trimmed,
      width_and_height: size,
      quality,
      batch_size: batch,
    };
    if (styleId) {
      body.style_id = styleId;
      body.style_strength = styleStrength;
    }
    if (characterId) {
      body.custom_reference_id = characterId;
      body.custom_reference_strength = characterStrength;
    }
    const seedTrimmed = seed.trim();
    if (seedTrimmed !== "") {
      const n = Number(seedTrimmed);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
        setSubmitError("Seed must be a whole number between 1 and 1000000, or empty for random.");
        return;
      }
      body.seed = n;
    }

    setSubmitting(true);
    try {
      const { job: created } = await postJSON<{ job: JobRecord }>("/api/generate/soul", body);
      setJob(created);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setSubmitMissingKeys(true);
      } else {
        setSubmitError(err instanceof Error ? err.message : "The request failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [prompt, submitting, size, quality, batch, styleId, styleStrength, characterId, characterStrength, seed, setJob]);

  const jobActive = !!job && !isTerminalStatus(job.status);
  const jobPrompt = typeof job?.params.prompt === "string" ? job.params.prompt : "Generated image";
  const jobBatch = job?.params.batch_size === 4 ? 4 : 1;
  const jobSize = typeof job?.params.width_and_height === "string" ? job.params.width_and_height : size;
  const [jobW, jobH] = jobSize.split("x").map(Number);
  const stylesLoading = styles === null && !stylesError && !stylesMissingKeys;

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create image</h1>
        <p className="mt-1 text-sm text-ink-300">
          Soul renders images from a prompt, with optional styles and characters.
        </p>
      </header>

      {/* Prompt bar */}
      <section className="animate-rise rise-1 mt-6 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
        <label htmlFor="soul-prompt" className="sr-only">
          Prompt
        </label>
        <Textarea
          id="soul-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image. Subject, light, lens, mood."
          className="min-h-28 bg-ink-950 text-[15px]"
        />

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Size" htmlFor="soul-size" className="col-span-2 sm:col-span-1">
            <Select id="soul-size" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quality" htmlFor="soul-quality">
            <Select
              id="soul-quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value as "720p" | "1080p")}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </Select>
          </Field>
          <Field label="Batch">
            <Segmented options={BATCHES} value={batch} onChange={setBatch} label="Batch size" />
          </Field>
          <Field label="Seed" htmlFor="soul-seed">
            <Input
              id="soul-seed"
              inputMode="numeric"
              placeholder="random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="font-mono"
            />
          </Field>
        </div>

        {characters.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
            <Field
              label="Character"
              htmlFor="soul-character"
              help="Trained faces keep their identity in the render."
            >
              <Select
                id="soul-character"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
              >
                <option value="">None</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {characterId && (
              <div className="pb-1 sm:pb-8">
                <Slider
                  label="Character strength"
                  value={characterStrength}
                  onChange={setCharacterStrength}
                />
              </div>
            )}
          </div>
        )}

        {selectedStyle && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <p className="text-[13px] text-ink-300">
              Style: <span className="font-medium text-ink-50">{selectedStyle.name}</span>
            </p>
            <Slider
              label="Strength"
              value={styleStrength}
              onChange={setStyleStrength}
              className="w-full sm:max-w-sm sm:flex-1"
            />
          </div>
        )}

        {!characterId && (styleId || seed.trim() !== "") && (
          <p className="mt-3 text-[13px] leading-relaxed text-amber">
            Heads up: without a character, the API&apos;s standard Soul route uses prompt, size and
            batch only. Style, seed and quality take effect once a character is selected.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            size="lg"
            onClick={submit}
            disabled={!prompt.trim()}
            loading={submitting}
            className="w-full sm:w-auto"
          >
            Generate image
          </Button>
        </div>
        {submitMissingKeys && (
          <p className="mt-2.5 text-sm text-amber">
            Add your Higgsfield API key first. Instructions are in the banner above.
          </p>
        )}
        {submitError && <p className="mt-2.5 text-sm text-danger">{submitError}</p>}
      </section>

      {/* Result */}
      <section className="animate-rise rise-2 mt-6" aria-label="Result">
        {job ? (
          <>
            <div className="rounded-xl border border-ink-700 bg-ink-900 px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-base font-semibold">Result</h2>
                <StatusBadge status={job.status} />
                <span className="font-mono text-xs text-ink-300">{elapsed}s</span>
                {job.cost != null && (
                  <span className="font-mono text-xs text-ink-300">{formatCredits(job.cost)} cr</span>
                )}
                <span className="ml-auto font-mono text-[11px] text-ink-400">{shortId(job.id)}</span>
              </div>

              {jobActive && <p className="mt-2.5 text-sm text-ink-300">{activeCopy(job.status)}</p>}

              {(job.status === "failed" || job.status === "nsfw") && (
                <>
                  <p className="mt-2.5 text-sm text-danger">
                    {job.error ?? "The job failed without an error message."}
                  </p>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={submit} loading={submitting}>
                      Try again
                    </Button>
                  </div>
                </>
              )}

              {job.status === "canceled" && (
                <>
                  <p className="mt-2.5 text-sm text-ink-300">This job was canceled before it finished.</p>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={submit} loading={submitting}>
                      Try again
                    </Button>
                  </div>
                </>
              )}

              {job.status === "completed" && job.assets.length === 0 && (
                <p className="mt-2.5 text-sm text-ink-300">
                  The job finished but returned no files. Rerun it from the jobs page.
                </p>
              )}
            </div>

            {jobActive && (
              <div
                className={cn(
                  "mt-3 grid gap-3",
                  jobBatch > 1 ? "grid-cols-2" : "max-w-xl grid-cols-1"
                )}
              >
                {Array.from({ length: jobBatch }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-ink-850"
                    style={{ aspectRatio: `${jobW || 3} / ${jobH || 4}` }}
                  />
                ))}
              </div>
            )}

            {job.status === "completed" && job.assets.length > 0 && (
              <div
                className={cn(
                  "mt-3 grid gap-3",
                  job.assets.length > 1 ? "grid-cols-2" : "max-w-xl grid-cols-1"
                )}
              >
                {job.assets.map((asset, i) => (
                  <figure
                    key={asset.path}
                    className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850"
                  >
                    {asset.type === "video" ? (
                      <video
                        src={`/api/assets/${asset.path}`}
                        controls
                        loop
                        playsInline
                        className="w-full rounded-lg"
                      />
                    ) : (
                      <img
                        src={`/api/assets/${asset.path}`}
                        alt={`Render ${i + 1}: ${jobPrompt}`}
                        className="w-full"
                      />
                    )}
                    <a
                      href={`/api/assets/${asset.path}`}
                      download
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-950/85 px-2.5 py-1.5 text-xs font-medium text-ink-50 transition-opacity hover:border-ink-600 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    >
                      <Download className="size-3.5" aria-hidden />
                      Download
                    </a>
                  </figure>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<ImageIcon />}
            title="No renders yet"
            body="Write a prompt, pick an aesthetic, render up to four at once."
          />
        )}
      </section>

      {/* Style gallery */}
      <section className="animate-rise rise-3 mt-10" aria-label="Styles">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Style</h2>
            <p className="mt-0.5 text-sm text-ink-300">
              One style per render. Click the selected tile to go back to no style.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <Input
              aria-label="Search styles"
              placeholder="Search styles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {stylesMissingKeys ? (
          <EmptyState
            className="mt-4"
            icon={<KeyRound />}
            title="Add your API key to browse styles"
            body="The style catalog comes from the Higgsfield API. Follow the steps in the banner above, then retry."
            action={
              <Button variant="secondary" onClick={loadStyles}>
                Retry
              </Button>
            }
          />
        ) : stylesError ? (
          <EmptyState
            className="mt-4"
            icon={<ImageIcon />}
            title="Styles did not load"
            body={stylesError}
            action={
              <Button variant="secondary" onClick={loadStyles}>
                Retry
              </Button>
            }
          />
        ) : stylesLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-ink-850" />
            ))}
          </div>
        ) : filteredStyles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900 px-5 py-8 text-center">
            <p className="text-sm text-ink-300">No styles match &quot;{search.trim()}&quot;.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filteredStyles.map((s) => {
              const selected = s.id === styleId;
              const toggle = () => setStyleId((cur) => (cur === s.id ? null : s.id));
              return s.preview_url && isVideoUrl(s.preview_url) ? (
                <PresetCard
                  key={s.id}
                  name={s.name}
                  description={s.description}
                  previewUrl={s.preview_url}
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
  );
}
