import crypto from "node:crypto";
import {
  getCampaign,
  insertCampaign,
  insertPublishItem,
  updateCampaign,
} from "@/lib/db";
import type {
  CampaignCaption,
  CampaignRecord,
  CampaignScene,
  CampaignTraceEvent,
  PublishQueueRecord,
  RouterStrategy,
} from "@/lib/higgsfield/types";
import { createRoutedJob, isTerminal, syncJob } from "@/lib/jobs";
import {
  HiggsfieldSupercomputerAdapter,
  supercomputerAgentAdapter,
} from "@/lib/providers/higgsfield-agent";
import { llmAdapter, type LlmAdapter } from "@/lib/providers/llm";
import { enhancePromptWithSkills, matchSkillsForBrief } from "@/lib/skills";
import { getBudgetSettings } from "@/lib/spend";

export interface CreateCampaignInput {
  brandName: string;
  brief: string;
  objective?: string;
  targetAudience?: string;
  platforms?: string[];
  sceneCount?: number;
  strategy?: RouterStrategy;
  autoGenerateMedia?: boolean;
  /** Optional reference image URL (e.g. product photo or Soul character still) to anchor continuity. */
  referenceImageUrl?: string;
}

interface PlannedCampaignPayload {
  script: NonNullable<CampaignRecord["script"]>;
  scenes: Array<{
    title: string;
    durationSec: number;
    narration: string;
    visualPrompt: string;
    motionPrompt: string;
    cameraMove: string;
    lighting: string;
  }>;
  captions: CampaignCaption[];
}

function buildDeterministicPlan(
  input: CreateCampaignInput,
  skillIds: string[]
): PlannedCampaignPayload {
  const brand = input.brandName.trim() || "EVIE-LABS";
  const brief = input.brief.trim();
  const objective = input.objective?.trim() || "Drive high-intent product discovery and conversion";
  const audience = input.targetAudience?.trim() || "Design-conscious digital consumers";
  const count = Math.min(4, Math.max(2, input.sceneCount ?? 3));
  const platforms = input.platforms?.length ? input.platforms : ["tiktok", "instagram", "youtube"];

  const visualStyle =
    "Editorial dark-room cinematography, 35mm anamorphic lens, controlled rim light, subtle film grain, consistent color grade across all cuts";
  const characterBible = `Consistent ${brand} visual world: signature product hero + clean studio hands/talent in neutral matte wardrobe, matched warm key light and cool slate shadows.`;

  const baseScenes = [
    {
      title: "01 · Scroll-Stopping Visual Hook",
      durationSec: 3,
      narration: `Stop scrolling — meet the new standard from ${brand}.`,
      visualPrompt: `${brand} hero subject emerging from deep obsidian shadow with sharp rim light reflecting off refined material textures. Context: ${brief}. ${visualStyle}`,
      motionPrompt: "Slow dramatic push in toward the hero subject, crisp shallow focus rack",
      cameraMove: "dolly_in",
      lighting: "High-contrast obsidian key + warm rim light",
    },
    {
      title: "02 · Craft & Feature Proof",
      durationSec: 4,
      narration: `Engineered for ${audience.toLowerCase()} who refuse ordinary compromises.`,
      visualPrompt: `Macro close-up detail shot showcasing ${brand} craftsmanship in real-world use, tactile surfaces, clean negative space. Context: ${brief}. ${visualStyle}`,
      motionPrompt: "Smooth lateral pan right gliding across surface texture with subtle parallax",
      cameraMove: "pan_right",
      lighting: "Soft overhead softbox + crisp specular edge",
    },
    {
      title: "03 · Lifestyle Payoff & Transformation",
      durationSec: 4,
      narration: `Effortless performance from morning briefing to after-hours studio.`,
      visualPrompt: `Editorial medium shot integrating ${brand} into an aspirational modern workspace environment, natural depth. Context: ${brief}. ${visualStyle}`,
      motionPrompt: "Gentle pull out revealing the full scene composition and atmosphere",
      cameraMove: "pull_out",
      lighting: "Practical warm window light + balanced fill",
    },
    {
      title: "04 · Signature Lockup & CTA",
      durationSec: 3,
      narration: `Experience ${brand} today.`,
      visualPrompt: `Clean symmetrical studio packshot of ${brand} centered on matte dark slate plinth, dramatic spotlight halo, zero text. ${visualStyle}`,
      motionPrompt: "Subtle slow push in holding centered symmetry for end-card readability",
      cameraMove: "slow_push",
      lighting: "Centered museum spotlight",
    },
  ].slice(0, count);

  const enhancedScenes = baseScenes.map((s) => ({
    ...s,
    visualPrompt: enhancePromptWithSkills(s.visualPrompt, skillIds).enhancedPrompt,
  }));

  const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const captions: CampaignCaption[] = platforms.map((platform, idx) => {
    const slot = new Date(nextDay.getTime() + idx * 4 * 60 * 60 * 1000).toISOString();
    const cleanTag = brand.toLowerCase().replace(/[^a-z0-9]/g, "") || "evielabs";
    return {
      platform,
      headline: `${brand} — ${objective}`,
      caption: `${brand}: ${brief.slice(0, 140)}${brief.length > 140 ? "…" : ""}\n\nCrafted for ${audience}. Watch the full cut and tell us which frame hits hardest.`,
      hashtags: [cleanTag, "evielabs", "aicreative", "brandfilm", platform.toLowerCase()],
      cta: `Explore ${brand} via the link in bio.`,
      recommendedSlotIso: slot,
    };
  });

  return {
    script: {
      hook: `Stop scrolling — meet the new standard from ${brand}.`,
      concept: `${count}-shot cinematic brand campaign translating "${brief.slice(0, 120)}" into consistent studio keyframes, animated clips, and platform-native copy.`,
      characterBible,
      visualStyle,
      cta: `Experience ${brand} today.`,
      totalDurationSec: enhancedScenes.reduce((acc, s) => acc + s.durationSec, 0),
    },
    scenes: enhancedScenes,
    captions,
  };
}

export class SupercomputerOrchestrator {
  private readonly agentApi: HiggsfieldSupercomputerAdapter;
  private readonly llm: LlmAdapter;

  constructor(opts?: { agentApi?: HiggsfieldSupercomputerAdapter; llm?: LlmAdapter }) {
    this.agentApi = opts?.agentApi ?? supercomputerAgentAdapter;
    this.llm = opts?.llm ?? llmAdapter;
  }

  /**
   * Executes a complete Supercomputer-style campaign from a brand brief:
   * 1. Probes official Higgsfield Supercomputer Agent API (if mode is auto/official)
   * 2. Uses official session if authorized, otherwise runs Vyolab's multi-stage orchestrator
   * 3. Matches Higgsfield open-source skills -> Script -> Storyboard -> Consistent Images -> Videos -> Captions
   * 4. Enqueues platform posts in `pending_approval` (NEVER auto-publishes!)
   */
  async runCampaign(input: CreateCampaignInput): Promise<{
    campaign: CampaignRecord;
    publishQueue: PublishQueueRecord[];
  }> {
    const now = Date.now();
    const platforms = input.platforms?.length ? input.platforms : ["tiktok", "instagram"];
    const matchedSkills = matchSkillsForBrief(input.brief, input.objective ?? "");
    const skillIds = matchedSkills.map((s) => s.id);
    const settings = getBudgetSettings();

    const trace: CampaignTraceEvent[] = [];
    const pushTrace = (stage: string, message: string, detail?: Record<string, unknown>) => {
      trace.push({ at: Date.now(), stage, message, ...(detail ? { detail } : {}) });
    };

    // 1. Check Official Higgsfield Supercomputer Agent API entitlement
    let engine: CampaignRecord["engine"] = "vyolab_orchestrator";
    let engineReason = "Configured for Vyolab local orchestrator.";
    let upstreamSessionId: string | null = null;

    if (settings.supercomputerMode !== "local") {
      const probe = await this.agentApi.probeAccess();
      pushTrace("supercomputer_probe", probe.detail, {
        status: probe.status,
        httpStatus: probe.httpStatus,
        authorized: probe.authorized,
      });

      if (probe.authorized && probe.sessionId) {
        engine = "higgsfield_supercomputer";
        engineReason = probe.detail;
        upstreamSessionId = probe.sessionId;
      } else {
        engine = "vyolab_orchestrator";
        engineReason = `Official Supercomputer API unavailable (${probe.status}): ${probe.detail}. Running Vyolab orchestration engine.`;
      }
    } else {
      pushTrace("supercomputer_probe", "SUPERCOMPUTER_MODE=local; using Vyolab orchestration engine.");
    }

    const campaignId = crypto.randomUUID();
    const initial: CampaignRecord = {
      id: campaignId,
      brandName: input.brandName.trim(),
      brief: input.brief.trim(),
      objective: input.objective?.trim() || "Brand awareness & conversion",
      targetAudience: input.targetAudience?.trim() || "Modern digital audience",
      platforms,
      skillIds,
      engine,
      engineReason,
      upstreamSessionId,
      status: "running",
      script: null,
      storyboard: [],
      captions: [],
      trace,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    insertCampaign(initial);

    try {
      pushTrace("skills", `Matched ${skillIds.length} Higgsfield open-source skills.`, { skillIds });

      // 2. If official Supercomputer API is authorized, dispatch the campaign brief to it
      if (engine === "higgsfield_supercomputer" && upstreamSessionId) {
        pushTrace(
          "official_agent",
          `Submitting brand brief to Higgsfield Supercomputer session ${upstreamSessionId}.`
        );
        const turn = await this.agentApi.runTurn(
          upstreamSessionId,
          `Brand: ${input.brandName}\nObjective: ${initial.objective}\nAudience: ${initial.targetAudience}\nPlatforms: ${platforms.join(", ")}\nSkills: ${skillIds.join(", ")}\nBrief: ${input.brief}\n\nProduce a concise script, shot-by-shot storyboard, image/video assets, and social captions.`,
          { timeoutMs: 90_000 }
        );
        pushTrace("official_agent_result", `Supercomputer turn ended with status "${turn.status}".`, {
          hasMessage: Boolean(turn.message),
          mediaCount: turn.message?.media?.length ?? 0,
        });
      }

      // 3. Plan Script, Storyboard & Captions (LLM-assisted when configured, deterministic fallback otherwise)
      let plan: PlannedCampaignPayload | null = null;
      if (this.llm.isConfigured()) {
        pushTrace("planning", "Generating script, storyboard, and captions via server-side LLM.");
        plan = await this.llm.generateJson<PlannedCampaignPayload>({
          system:
            "You are Vyolab's Supercomputer Creative Director. Output strict JSON with keys: script {hook, concept, characterBible, visualStyle, cta, totalDurationSec}, scenes [{title, durationSec, narration, visualPrompt, motionPrompt, cameraMove, lighting}], captions [{platform, headline, caption, hashtags, cta, recommendedSlotIso}]. Keep 2-4 scenes with strict visual & character continuity.",
          user: JSON.stringify({
            brandName: input.brandName,
            brief: input.brief,
            objective: initial.objective,
            targetAudience: initial.targetAudience,
            platforms,
            sceneCount: input.sceneCount ?? 3,
            skills: matchedSkills.map((s) => ({
              id: s.id,
              description: s.description,
              guidance: s.promptGuidance.slice(0, 3),
            })),
          }),
        });
      }

      if (!plan || !Array.isArray(plan.scenes) || plan.scenes.length === 0) {
        pushTrace(
          "planning",
          this.llm.isConfigured()
            ? "LLM returned invalid JSON; using deterministic skills-guided creative plan."
            : "No external LLM key set; using deterministic Higgsfield-skills creative planner."
        );
        plan = buildDeterministicPlan(input, skillIds);
      }

      const storyboard: CampaignScene[] = plan.scenes.map((s, idx) => ({
        index: idx,
        title: s.title,
        durationSec: s.durationSec,
        narration: s.narration,
        visualPrompt: s.visualPrompt,
        motionPrompt: s.motionPrompt,
        cameraMove: s.cameraMove,
        lighting: s.lighting,
        imageJobId: null,
        imageAssetPath: null,
        videoJobId: null,
        videoAssetPath: null,
        status: "planned",
      }));

      updateCampaign(campaignId, {
        script: plan.script,
        storyboard,
        captions: plan.captions,
        trace,
      });

      // 4. Generate consistent keyframe images & I2V clips via Model Router
      const autoMedia = input.autoGenerateMedia ?? true;
      const producedMediaPaths: string[] = [];

      if (autoMedia) {
        const continuitySeed = 100_000 + (campaignId.charCodeAt(0) * 137) % 800_000;

        for (const scene of storyboard) {
          scene.status = "generating_image";
          updateCampaign(campaignId, { storyboard, trace });

          let keyframeUrl: string | null = input.referenceImageUrl ?? null;

          if (!keyframeUrl || scene.index > 0) {
            try {
              const { job: imgJob, decision: imgDecision } = await createRoutedJob({
                kind: "soul",
                task: "t2i",
                strategy: input.strategy,
                params: {
                  prompt: `${scene.visualPrompt}. Continuity anchor: ${plan.script.characterBible}`,
                  seed: continuitySeed + scene.index,
                },
                campaignId,
                sceneIndex: scene.index,
              });
              scene.imageJobId = imgJob.id;
              pushTrace("image_generation", `Scene ${scene.index + 1} keyframe routed to ${imgDecision.selectedModelId}.`, {
                provider: imgDecision.selectedProvider,
                estimatedUsd: imgDecision.estimatedCostUsd,
                jobId: imgJob.id,
              });

              const syncedImg = isTerminal(imgJob.status) ? imgJob : await syncJob(imgJob.id);
              if (syncedImg?.assets?.[0]) {
                scene.imageAssetPath = syncedImg.assets[0].path;
                keyframeUrl = `/api/assets/${syncedImg.assets[0].path}`;
              }
            } catch (err) {
              scene.error = err instanceof Error ? err.message : String(err);
              pushTrace("image_warning", `Scene ${scene.index + 1} image skipped: ${scene.error}`);
            }
          }

          if (keyframeUrl) {
            scene.status = "generating_video";
            updateCampaign(campaignId, { storyboard, trace });

            try {
              const { job: vidJob, decision: vidDecision } = await createRoutedJob({
                kind: "dop",
                task: "i2v",
                strategy: input.strategy,
                params: {
                  image_url: keyframeUrl,
                  prompt: `${scene.motionPrompt}. ${scene.lighting}.`,
                  duration: scene.durationSec,
                  seed: continuitySeed + scene.index,
                },
                campaignId,
                sceneIndex: scene.index,
              });
              scene.videoJobId = vidJob.id;
              pushTrace("video_generation", `Scene ${scene.index + 1} I2V routed to ${vidDecision.selectedModelId}.`, {
                provider: vidDecision.selectedProvider,
                estimatedUsd: vidDecision.estimatedCostUsd,
                jobId: vidJob.id,
              });

              const syncedVid = isTerminal(vidJob.status) ? vidJob : await syncJob(vidJob.id);
              if (syncedVid?.assets?.[0]) {
                scene.videoAssetPath = syncedVid.assets[0].path;
                producedMediaPaths.push(syncedVid.assets[0].path);
                scene.status = "completed";
              } else if (syncedVid?.status === "failed") {
                scene.status = "failed";
                scene.error = syncedVid.error;
              } else {
                // Async cloud job still rendering — mark as generating_video
                scene.status = "generating_video";
              }
            } catch (err) {
              scene.status = "failed";
              scene.error = err instanceof Error ? err.message : String(err);
              pushTrace("video_warning", `Scene ${scene.index + 1} video error: ${scene.error}`);
            }
          } else {
            scene.status = "failed";
            scene.error = scene.error ?? "No keyframe available for I2V.";
          }

          updateCampaign(campaignId, { storyboard, trace });
        }
      }

      // 5. Enqueue Postiz drafts strictly as `pending_approval` (NEVER auto-publish!)
      const publishQueue: PublishQueueRecord[] = [];
      for (const cap of plan.captions) {
        const item: PublishQueueRecord = {
          id: crypto.randomUUID(),
          campaignId,
          jobId: storyboard[0]?.videoJobId ?? null,
          platform: cap.platform,
          integrationId: null,
          caption: `${cap.headline}\n\n${cap.caption}\n\n${cap.cta}`,
          hashtags: cap.hashtags,
          mediaPaths: producedMediaPaths.slice(0, 1),
          scheduledAt: cap.recommendedSlotIso,
          approvalStatus: "pending_approval",
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null,
          postizPostId: null,
          publishStatus: "draft",
          error: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        insertPublishItem(item);
        publishQueue.push(item);
      }

      pushTrace(
        "publish_queue",
        `Created ${publishQueue.length} social post draft(s) in pending_approval state (awaiting human approval before Postiz dispatch).`
      );

      updateCampaign(campaignId, {
        status: "completed",
        storyboard,
        trace,
      });

      return {
        campaign: getCampaign(campaignId)!,
        publishQueue,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushTrace("error", msg);
      updateCampaign(campaignId, { status: "failed", error: msg, trace });
      return {
        campaign: getCampaign(campaignId)!,
        publishQueue: [],
      };
    }
  }
}

export const supercomputerOrchestrator = new SupercomputerOrchestrator();
