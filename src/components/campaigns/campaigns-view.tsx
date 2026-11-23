"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
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

  const [brandName, setBrandName] = useState("EVIE-LABS");
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);
  const [sceneCount, setSceneCount] = useState(3);
  const [strategy, setStrategy] = useState<RouterStrategy>("balanced");
  const [autoMedia, setAutoMedia] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const briefParam = params.get("brief");
    if (briefParam) setBrief(briefParam);
  }, []);

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
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-white">
              Supercomputer Agent
            </h1>
            <span className="text-[12px] text-white/45">
              Brief to script, storyboard, routed video, and approval-gated Postiz drafts
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {campaigns.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer",
                  selected?.id === c.id
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/65 hover:bg-white/[0.1] hover:text-white"
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
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[12px]">
            <span className={probe.authorized ? "font-semibold text-[#d1fe17]" : "font-semibold text-amber"}>
              {probe.status}
            </span>
            <span className="ml-2 text-white/65">{probe.detail}</span>
          </div>
        )}

        {!selected ? (
          <div className="mt-8">
            <EmptyState
              icon={<Sparkles aria-hidden />}
              title="Direct a campaign from the dock below"
              body="Enter your brand brief — EVIE-LABS matches Higgsfield skills, writes the script & storyboard, routes keyframes + video clips across GPU/API adapters, and queues Postiz drafts for human approval."
            />
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-5">
            {/* Campaign Script & Meta Card */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-5">
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
                <span className="text-[15px] font-bold text-white">{selected.brandName}</span>
                <span className="rounded-md bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-white/75">
                  {selected.engine}
                </span>
                {selected.skillIds.map((sid) => (
                  <span
                    key={sid}
                    className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55"
                  >
                    {sid}
                  </span>
                ))}
                <Link
                  href="/publish"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#d1fe17] px-3 py-1.5 text-[12px] font-bold text-black transition-colors hover:bg-[#dcff4a]"
                >
                  Approve in Publish ({selected.captions.length})
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>

              {selected.script && (
                <div className="mt-4 grid grid-cols-1 gap-5 border-t border-white/[0.07] pt-4 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <p className="text-[11px] font-medium text-white/40">Hook &amp; Concept</p>
                    <p className="mt-1 text-[16px] font-semibold text-white">
                      &ldquo;{selected.script.hook}&rdquo;
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
                      {selected.script.concept}
                    </p>
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-[11px] font-medium text-white/40">
                      Continuity Bible · {selected.script.totalDurationSec}s
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                      {selected.script.characterBible}
                    </p>
                    <p className="mt-2 text-[11px] text-white/40">{selected.engineReason}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Horizontal Widescreen Storyboard Filmstrip */}
            {selected.storyboard.length > 0 && (
              <section aria-label="Storyboard filmstrip">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-white">
                    Storyboard Filmstrip ({selected.storyboard.length} shots)
                  </h2>
                  <span className="text-[12px] text-white/45">Routed keyframes &amp; motion clips</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {selected.storyboard.map((scene) => (
                    <article
                      key={scene.index}
                      className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0c]"
                    >
                      <div className="relative aspect-video w-full bg-black">
                        {scene.videoAssetPath ? (
                          <video
                            src={`/api/assets/${scene.videoAssetPath}#t=0.1`}
                            poster={
                              scene.imageAssetPath
                                ? `/api/assets/${scene.imageAssetPath}`
                                : undefined
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
                          <div className="grid size-full place-items-center text-[12px] text-white/40">
                            {scene.status}
                          </div>
                        )}
                        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-md">
                          0{scene.index + 1} · {scene.cameraMove} · {scene.durationSec}s
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col gap-1.5 p-4">
                        <h3 className="text-[13px] font-semibold text-white">{scene.title}</h3>
                        <p className="text-[12px] leading-relaxed text-white/70">{scene.narration}</p>
                        <p className="mt-auto pt-2 text-[11px] text-white/40">{scene.motionPrompt}</p>
                        {scene.error && <p className="text-[11px] text-amber">{scene.error}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Postiz Drafts + Trace */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {selected.captions.length > 0 && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-4 lg:col-span-7">
                  <p className="text-[12px] font-semibold text-white">
                    Postiz Drafts (Awaiting Approval)
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selected.captions.map((c, idx) => (
                      <div
                        key={`${c.platform}-${idx}`}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-white uppercase">
                            {c.platform}
                          </span>
                          <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[10px] font-medium text-amber">
                            Pending Approval
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-relaxed text-white/70">
                          {c.caption}
                        </p>
                        <p className="mt-2 truncate text-[11px] text-white/40">
                          {c.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selected.trace.length > 0 && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-4 lg:col-span-5">
                  <p className="text-[12px] font-semibold text-white">Execution Trace</p>
                  <div className="mt-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto font-mono text-[11px]">
                    {selected.trace.map((ev, idx) => (
                      <div key={idx} className="flex gap-2 text-white/60">
                        <span className="shrink-0 text-white/90">{ev.stage}</span>
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

      {/* Exact Higgsfield Floating Bottom Prompt Slab */}
      <form
        onSubmit={handleRun}
        className="fixed inset-x-3 bottom-16 z-30 mx-auto max-w-[780px] lg:bottom-5"
      >
        <div className="rounded-[20px] border border-white/[0.11] bg-[#141416]/95 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.92)] backdrop-blur-2xl">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 pl-1">
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  aria-label="Brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand"
                  className="h-9 w-28 shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 text-[13px] font-bold text-white focus:border-white/30 focus:outline-none sm:w-32"
                />
                <input
                  type="text"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe your brand brief. EVIE-LABS will build the full campaign."
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {ALL_PLATFORMS.map((p) => {
                  const on = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "h-7 rounded-lg px-2.5 text-[11px] font-medium capitalize transition-colors cursor-pointer",
                        on
                          ? "bg-white text-black"
                          : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}

                <label className="relative inline-flex h-7 items-center rounded-lg bg-white/[0.07] pl-2.5 pr-6 text-[11px] font-medium text-white/85">
                  <select
                    aria-label="Scene count"
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value))}
                    className="appearance-none bg-transparent text-[11px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value={2} className="bg-[#141416]">2 shots</option>
                    <option value={3} className="bg-[#141416]">3 shots</option>
                    <option value={4} className="bg-[#141416]">4 shots</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-white/45" />
                </label>

                <label className="relative inline-flex h-7 items-center rounded-lg bg-white/[0.07] pl-2.5 pr-6 text-[11px] font-medium text-white/85">
                  <select
                    aria-label="Router strategy"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as RouterStrategy)}
                    className="appearance-none bg-transparent text-[11px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="balanced" className="bg-[#141416]">Balanced</option>
                    <option value="gpu_first" className="bg-[#141416]">GPU First ($0)</option>
                    <option value="cost" className="bg-[#141416]">Lowest Cost</option>
                    <option value="quality" className="bg-[#141416]">Max Quality</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-white/45" />
                </label>

                <button
                  type="button"
                  onClick={() => setAutoMedia((v) => !v)}
                  className={cn(
                    "h-7 rounded-lg px-2.5 text-[11px] font-medium transition-colors cursor-pointer",
                    autoMedia ? "bg-white/[0.12] text-white" : "bg-white/[0.05] text-white/45"
                  )}
                >
                  Media {autoMedia ? "On" : "Off"}
                </button>

                {error && (
                  <span className="ml-auto text-[11px] text-danger" role="alert">
                    {error}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!brandName.trim() || brief.trim().length < 10 || running}
              className="flex min-h-[72px] shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#d1fe17] px-7 text-[12px] font-extrabold tracking-[0.06em] text-black uppercase transition-all hover:bg-[#dcff4a] active:scale-[0.99] disabled:bg-white/[0.08] disabled:text-white/30 cursor-pointer"
            >
              {running && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              )}
              RUN AGENT
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
