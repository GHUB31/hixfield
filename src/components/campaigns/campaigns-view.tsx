"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { getJSON, postJSON } from "@/lib/fetcher";
import type { CampaignRecord, PublishQueueRecord, RouterStrategy } from "@/lib/higgsfield/types";
import { cn, shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";

interface ProbeResult {
  status: string;
  authorized: boolean;
  baseUrl: string;
  httpStatus: number | null;
  detail: string;
}

const ALL_PLATFORMS = ["tiktok", "instagram", "youtube", "x", "linkedin"] as const;

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [selected, setSelected] = useState<CampaignRecord | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  // Floating Supercomputer Brief Dock state
  const [brandName, setBrandName] = useState("Vyolab");
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);
  const [sceneCount, setSceneCount] = useState(3);
  const [strategy, setStrategy] = useState<RouterStrategy>("balanced");
  const [autoMedia, setAutoMedia] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await getJSON<{ campaigns: CampaignRecord[] }>("/api/campaigns");
      setCampaigns(data.campaigns);
      if (data.campaigns.length > 0 && !selected) {
        setSelected(data.campaigns[0]);
      }
    } catch {
      /* ignore */
    }
  }, [selected]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  async function runProbe() {
    setProbing(true);
    try {
      const data = await getJSON<{ probe: ProbeResult }>("/api/campaigns/probe");
      setProbe(data.probe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Probe failed.");
    } finally {
      setProbing(false);
    }
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim() || brief.trim().length < 10 || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await postJSON<{
        campaign: CampaignRecord;
        publishQueue: PublishQueueRecord[];
      }>("/api/campaigns", {
        brandName: brandName.trim(),
        brief: brief.trim(),
        platforms,
        sceneCount,
        strategy,
        autoGenerateMedia: autoMedia,
      });
      setSelected(res.campaign);
      setCampaigns((prev) => [res.campaign, ...prev]);
      setBrief("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
    <div className="animate-rise pb-44">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">
            Supercomputer Agent
          </h1>
          <span className="rounded-full border border-lime-400/25 bg-lime-400/10 px-2.5 py-0.5 font-mono text-[11px] text-lime-400">
            Brief → Script → Storyboard → Video → Postiz Approval
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {campaigns.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selected?.id === c.id
                  ? "border-lime-400/60 bg-ink-800 font-medium text-lime-400"
                  : "border-ink-800 bg-ink-900 text-ink-300 hover:border-ink-700"
              )}
            >
              {c.brandName} · {shortId(c.id)}
            </button>
          ))}
          <Button variant="secondary" size="sm" onClick={() => void runProbe()} loading={probing}>
            <RefreshCw className="size-3.5" aria-hidden />
            Probe Official API
          </Button>
        </div>
      </header>

      {probe && (
        <div className="mt-4 rounded-xl border border-ink-800 bg-ink-900/90 px-4 py-2.5 font-mono text-xs">
          <span className={probe.authorized ? "text-lime-400" : "text-amber"}>
            [{probe.status}]
          </span>{" "}
          <span className="text-ink-300">{probe.detail}</span>
        </div>
      )}

      {/* Main Visual Filmstrip Stage */}
      {!selected ? (
        <div className="mt-8">
          <EmptyState
            icon={<Sparkles aria-hidden />}
            title="Direct a campaign from the Supercomputer dock below"
            body="Describe your brand and launch goal — Vyolab matches Higgsfield skills, writes the script & storyboard, routes keyframes + videos across GPU/API adapters, and queues approval-gated Postiz drafts."
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {/* Script & Engine Banner */}
          <section className="rounded-2xl border border-ink-800 bg-ink-900/80 p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge
                status={
                  selected.status === "completed"
                    ? "completed"
                    : selected.status === "failed"
                      ? "failed"
                      : "in_progress"
                }
              />
              <span className="text-base font-semibold text-ink-50">{selected.brandName}</span>
              <span className="rounded-full border border-ink-700 bg-ink-950 px-2.5 py-0.5 font-mono text-[11px] text-lime-400">
                {selected.engine}
              </span>
              {selected.skillIds.map((sid) => (
                <span
                  key={sid}
                  className="rounded-full border border-ink-800 bg-ink-950 px-2.5 py-0.5 font-mono text-[10px] text-ink-300"
                >
                  {sid}
                </span>
              ))}
              <Link
                href="/publish"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-mono text-[11px] text-lime-400 hover:bg-lime-400/20"
              >
                Approve in Publish ({selected.captions.length})
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>

            {selected.script && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-ink-800 pt-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                    Hook &amp; Concept
                  </p>
                  <p className="mt-1 text-base font-medium text-ink-50">
                    &ldquo;{selected.script.hook}&rdquo;
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                    {selected.script.concept}
                  </p>
                </div>
                <div className="lg:col-span-5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                    Continuity Bible · {selected.script.totalDurationSec}s
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-300">
                    {selected.script.characterBible}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-ink-400">{selected.engineReason}</p>
                </div>
              </div>
            )}
          </section>

          {/* Horizontal Cinema Storyboard Filmstrip */}
          {selected.storyboard.length > 0 && (
            <section aria-label="Storyboard filmstrip">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
                  Storyboard Filmstrip · {selected.storyboard.length} Routed Shots
                </h2>
                <span className="font-mono text-[11px] text-ink-400">
                  Hover or play clips directly
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selected.storyboard.map((scene) => (
                  <article
                    key={scene.index}
                    className="flex flex-col overflow-hidden rounded-2xl border border-ink-800 bg-ink-900"
                  >
                    {/* Visual Cinema Frame / Video Player */}
                    <div className="relative aspect-video w-full bg-ink-950">
                      {scene.videoAssetPath ? (
                        <video
                          src={`/api/assets/${scene.videoAssetPath}#t=0.1`}
                          poster={
                            scene.imageAssetPath ? `/api/assets/${scene.imageAssetPath}` : undefined
                          }
                          controls
                          loop
                          muted
                          playsInline
                          preload="auto"
                          className="size-full object-cover"
                        />
                      ) : scene.imageAssetPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/assets/${scene.imageAssetPath}`}
                          alt={scene.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center font-mono text-xs text-ink-400">
                          {scene.status}
                        </div>
                      )}
                      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-ink-950/80 px-2.5 py-0.5 font-mono text-[10px] text-lime-400 backdrop-blur-md">
                        SHOT 0{scene.index + 1} · {scene.cameraMove} · {scene.durationSec}s
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <h3 className="text-sm font-semibold text-ink-50">{scene.title}</h3>
                      <p className="text-xs leading-relaxed text-ink-200">{scene.narration}</p>
                      <p className="mt-auto pt-2 font-mono text-[11px] text-ink-400">
                        {scene.motionPrompt}
                      </p>
                      {scene.error && (
                        <p className="font-mono text-[11px] text-amber">{scene.error}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Captions & Execution Trace side-by-side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {selected.captions.length > 0 && (
              <section className="rounded-2xl border border-ink-800 bg-ink-900/80 p-4 lg:col-span-7">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                  Postiz Drafts (Pending Human Approval)
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selected.captions.map((c, idx) => (
                    <div
                      key={`${c.platform}-${idx}`}
                      className="rounded-xl border border-ink-800 bg-ink-950/80 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase text-lime-400">
                          {c.platform}
                        </span>
                        <span className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber">
                          pending_approval
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-ink-200">
                        {c.caption}
                      </p>
                      <p className="mt-2 truncate font-mono text-[10px] text-ink-400">
                        {c.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {selected.trace.length > 0 && (
              <section className="rounded-2xl border border-ink-800 bg-ink-900/80 p-4 lg:col-span-5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                  Agent Trace
                </p>
                <div className="mt-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto font-mono text-[11px]">
                  {selected.trace.map((ev, idx) => (
                    <div key={idx} className="flex gap-2 text-ink-300">
                      <span className="shrink-0 text-lime-400">[{ev.stage}]</span>
                      <span>{ev.message}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Floating Bottom Supercomputer Agent Brief Dock */}
      <form
        onSubmit={handleRun}
        className="fixed inset-x-3 bottom-16 z-30 mx-auto max-w-4xl lg:bottom-5"
      >
        <div className="rounded-2xl border border-ink-700/90 bg-ink-900/92 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              aria-label="Brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Brand"
              className="h-10 w-full shrink-0 rounded-xl border border-ink-700 bg-ink-950 px-3 text-sm font-semibold text-ink-50 focus:border-lime-400 focus:outline-none sm:w-36"
            />
            <textarea
              rows={2}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Paste your brand brief — Supercomputer writes scripts, storyboards, generates consistent shots & queues approval-gated posts..."
              className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-snug text-ink-50 placeholder:text-ink-400 focus:outline-none"
            />
            <Button
              type="submit"
              size="lg"
              disabled={!brandName.trim() || brief.trim().length < 10}
              loading={running}
              className="shrink-0 rounded-xl px-5"
            >
              <Sparkles className="size-4" aria-hidden />
              Run Agent
            </Button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-ink-800/80 pt-2.5 font-mono text-[11px]">
            <div className="flex items-center gap-1">
              {ALL_PLATFORMS.map((p) => {
                const on = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 transition-colors",
                      on
                        ? "border-lime-400/50 bg-lime-400/10 text-lime-400"
                        : "border-ink-800 bg-ink-950 text-ink-400 hover:text-ink-200"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <select
              aria-label="Scene count"
              value={sceneCount}
              onChange={(e) => setSceneCount(Number(e.target.value))}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2 py-1 text-ink-200"
            >
              <option value={2}>2 shots</option>
              <option value={3}>3 shots</option>
              <option value={4}>4 shots</option>
            </select>

            <select
              aria-label="Router strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as RouterStrategy)}
              className="rounded-lg border border-ink-700 bg-ink-950 px-2 py-1 text-ink-200"
            >
              <option value="balanced">Balanced Router</option>
              <option value="gpu_first">GPU First ($0)</option>
              <option value="cost">Lowest Cost</option>
              <option value="quality">Max Quality</option>
            </select>

            <button
              type="button"
              onClick={() => setAutoMedia((v) => !v)}
              className={cn(
                "rounded-lg border px-2 py-1 transition-colors",
                autoMedia
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-ink-700 bg-ink-950 text-ink-400"
              )}
            >
              Media {autoMedia ? "ON" : "OFF"}
            </button>

            {error && (
              <span className="ml-auto text-danger" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
