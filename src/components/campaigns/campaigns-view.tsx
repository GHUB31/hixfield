"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { getJSON, postJSON } from "@/lib/fetcher";
import type { CampaignRecord, PublishQueueRecord, RouterStrategy } from "@/lib/higgsfield/types";
import { shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/media-upload";
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

  // Brief form
  const [brandName, setBrandName] = useState("Vyolab");
  const [brief, setBrief] = useState("");
  const [objective, setObjective] = useState("Product launch & scroll-stopping short-form conversion");
  const [targetAudience, setTargetAudience] = useState("Creative founders and DTC shoppers");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);
  const [sceneCount, setSceneCount] = useState("3");
  const [strategy, setStrategy] = useState<RouterStrategy>("balanced");
  const [autoMedia, setAutoMedia] = useState(true);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandId = useId();
  const briefId = useId();
  const objId = useId();
  const audId = useId();
  const stratId = useId();
  const countId = useId();

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
        objective: objective.trim(),
        targetAudience: targetAudience.trim(),
        platforms,
        sceneCount: Number(sceneCount),
        strategy,
        autoGenerateMedia: autoMedia,
        ...(referenceImageUrl ? { referenceImageUrl } : {}),
      });
      setSelected(res.campaign);
      setCampaigns((prev) => [res.campaign, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="animate-rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Supercomputer Agent</h1>
          <p className="mt-1.5 text-sm text-ink-300">
            Turn one brand brief into scripts, storyboards, consistent keyframes, videos, captions,
            and approval-gated Postiz drafts.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void runProbe()} loading={probing}>
          <RefreshCw className="size-3.5" aria-hidden />
          Probe Official Supercomputer API
        </Button>
      </header>

      {probe && (
        <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-xs">
          <span className={probe.authorized ? "text-lime-400" : "text-amber"}>
            [{probe.status}]
          </span>{" "}
          <span className="text-ink-300">{probe.detail}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Brief composer */}
        <form
          onSubmit={handleRun}
          className="animate-rise rise-1 flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5 lg:col-span-5"
        >
          <Field label="Brand name" htmlFor={brandId}>
            <Input
              id={brandId}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Vyolab"
            />
          </Field>

          <Field
            label="Brand brief"
            htmlFor={briefId}
            help="Describe the product, key angle, tone, and offer (min 10 chars)."
          >
            <Textarea
              id={briefId}
              rows={4}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Launch our obsidian matte ceramic smart carafe with 24-hour temperature lock. Minimalist nocturnal studio look, crisp macro steam shots, clean product hero reveal."
            />
          </Field>

          <Field label="Campaign objective" htmlFor={objId}>
            <Input id={objId} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </Field>

          <Field label="Target audience" htmlFor={audId}>
            <Input
              id={audId}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </Field>

          <MediaUpload
            label="Anchor product / character frame (optional)"
            kind="image"
            value={referenceImageUrl}
            onChange={setReferenceImageUrl}
            help="Anchors visual continuity on Shot 1 when generating videos."
          />

          <Field label="Target platforms">
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                      active
                        ? "border-lime-400 bg-lime-400/10 text-lime-400"
                        : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scenes" htmlFor={countId}>
              <Select
                id={countId}
                value={sceneCount}
                onChange={(e) => setSceneCount(e.target.value)}
              >
                <option value="2">2 shots</option>
                <option value="3">3 shots</option>
                <option value="4">4 shots</option>
              </Select>
            </Field>
            <Field label="Router strategy" htmlFor={stratId}>
              <Select
                id={stratId}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as RouterStrategy)}
              >
                <option value="balanced">Balanced</option>
                <option value="gpu_first">GPU First ($0)</option>
                <option value="cost">Lowest Cost</option>
                <option value="quality">Max Quality</option>
              </Select>
            </Field>
          </div>

          <Switch
            checked={autoMedia}
            onChange={setAutoMedia}
            label="Generate keyframes & I2V clips automatically"
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!brandName.trim() || brief.trim().length < 10}
            loading={running}
          >
            Run Supercomputer Campaign
          </Button>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>

        {/* Right: Campaign output & storyboard */}
        <div className="animate-rise rise-2 flex flex-col gap-5 lg:col-span-7">
          {!selected ? (
            <EmptyState
              icon={<Sparkles aria-hidden />}
              title="No campaign run yet"
              body="Enter a brand brief to generate scripts, storyboards, routed media clips, captions, and approval-gated social drafts."
            />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Campaign header */}
              <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
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
                  <span className="font-mono text-xs text-ink-400">{shortId(selected.id)}</span>
                  <span className="rounded-md border border-ink-700 bg-ink-850 px-2 py-0.5 font-mono text-[11px] text-lime-400">
                    {selected.engine}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink-50">{selected.brandName}</h2>
                <p className="mt-1 text-sm text-ink-300">{selected.engineReason}</p>
                {selected.skillIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.skillIds.map((sid) => (
                      <span
                        key={sid}
                        className="rounded-md border border-ink-700 bg-ink-850 px-2 py-0.5 font-mono text-[11px] text-ink-300"
                      >
                        skill:{sid}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Script */}
              {selected.script && (
                <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                  <h3 className="text-sm font-semibold text-ink-50">Script &amp; Continuity Bible</h3>
                  <p className="mt-2 text-sm text-ink-100">&ldquo;{selected.script.hook}&rdquo;</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
                    {selected.script.concept}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-ink-800 pt-3 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[11px] uppercase text-ink-400">Continuity</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-300">
                        {selected.script.characterBible}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase text-ink-400">CTA · Runtime</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-300">
                        {selected.script.cta} ({selected.script.totalDurationSec}s)
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Storyboard */}
              {selected.storyboard.length > 0 && (
                <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                  <h3 className="text-sm font-semibold text-ink-50">
                    Storyboard &amp; Routed Shots ({selected.storyboard.length})
                  </h3>
                  <div className="mt-4 flex flex-col gap-4">
                    {selected.storyboard.map((scene) => (
                      <div
                        key={scene.index}
                        className="rounded-lg border border-ink-700 bg-ink-850 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink-50">{scene.title}</span>
                          <span className="font-mono text-[11px] text-ink-400">
                            {scene.cameraMove} · {scene.durationSec}s · {scene.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-ink-300">
                          <span className="font-mono text-ink-400">VO:</span> {scene.narration}
                        </p>
                        <p className="mt-1 text-xs text-ink-400">
                          <span className="font-mono">MOTION:</span> {scene.motionPrompt}
                        </p>
                        {(scene.videoAssetPath || scene.imageAssetPath) && (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {scene.imageAssetPath && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/assets/${scene.imageAssetPath}`}
                                alt={scene.title}
                                className="w-full rounded-lg border border-ink-700 object-cover"
                              />
                            )}
                            {scene.videoAssetPath && (
                              <video
                                src={`/api/assets/${scene.videoAssetPath}`}
                                controls
                                loop
                                playsInline
                                className="w-full rounded-lg border border-ink-700"
                              />
                            )}
                          </div>
                        )}
                        {scene.error && (
                          <p className="mt-2 font-mono text-xs text-amber">{scene.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Captions + link to Publishing Approval Queue */}
              {selected.captions.length > 0 && (
                <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-50">
                      Queued Social Drafts (Pending Approval)
                    </h3>
                    <Link
                      href="/publish"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-lime-400 underline decoration-lime-400/40 underline-offset-2 hover:decoration-lime-400"
                    >
                      Review &amp; Approve in Publish
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {selected.captions.map((c, idx) => (
                      <div
                        key={`${c.platform}-${idx}`}
                        className="rounded-lg border border-ink-700 bg-ink-850 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs uppercase text-lime-400">
                            {c.platform}
                          </span>
                          <span className="font-mono text-[11px] text-amber">
                            pending_approval
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-ink-200">
                          {c.caption}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-ink-400">
                          {c.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Execution trace */}
              {selected.trace.length > 0 && (
                <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                  <h3 className="text-sm font-semibold text-ink-50">Agent Trace</h3>
                  <div className="mt-3 flex flex-col gap-1.5 font-mono text-[11px]">
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
          )}

          {/* Previous campaigns list */}
          {campaigns.length > 1 && (
            <section className="rounded-xl border border-ink-700 bg-ink-900 p-4">
              <p className="font-mono text-[11px] uppercase text-ink-400">Recent campaigns</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === c.id
                        ? "border-lime-400 bg-ink-800 text-ink-50"
                        : "border-ink-800 bg-ink-850 text-ink-300 hover:border-ink-700"
                    }`}
                  >
                    <span className="truncate font-medium">{c.brandName}</span>
                    <span className="font-mono text-[11px] text-ink-400">
                      {c.storyboard.length} shots · {c.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
