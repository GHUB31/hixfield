import type {
  ProviderId,
  RouterStrategy,
  RoutingCandidateAudit,
  RoutingDecision,
} from "@/lib/higgsfield/types";
import { activeUpstreamCount } from "@/lib/db";
import { maxConcurrency } from "@/lib/env";
import { checkAllProvidersHealth } from "@/lib/providers/registry";
import type { ProviderHealth, TaskKind } from "@/lib/providers/types";
import { canAffordEstimatedSpend, getBudgetSettings } from "@/lib/spend";

export interface RouteCandidateSpec {
  provider: ProviderId;
  modelId: string;
  label: string;
  route: string;
  tasks: readonly TaskKind[];
  /** 0-100 calibrated creative quality score for this task. */
  qualityScore: number;
  /** Estimated USD cost per generation ($0 for self-hosted/Colab GPU or local). */
  estimatedCostUsd: number;
  isGpuWorker?: boolean;
  notes: string;
}

export const ROUTER_CATALOG: readonly RouteCandidateSpec[] = [
  // ── Image-to-Video (i2v) ──
  {
    provider: "higgsfield",
    modelId: "higgsfield/dop-standard",
    label: "Higgsfield DoP Standard",
    route: "/higgsfield-ai/dop/standard",
    tasks: ["i2v"],
    qualityScore: 95,
    estimatedCostUsd: 0.45,
    notes: "Camera-controlled cinema motion presets (paid API).",
  },
  {
    provider: "higgsfield",
    modelId: "higgsfield/dop-turbo",
    label: "Higgsfield DoP Turbo",
    route: "/higgsfield-ai/dop/turbo",
    tasks: ["i2v"],
    qualityScore: 89,
    estimatedCostUsd: 0.25,
    notes: "Faster DoP camera motion (paid API).",
  },
  {
    provider: "higgsfield",
    modelId: "higgsfield/dop-lite",
    label: "Higgsfield DoP Lite",
    route: "/higgsfield-ai/dop/lite",
    tasks: ["i2v"],
    qualityScore: 82,
    estimatedCostUsd: 0.14,
    notes: "Lowest-cost official Higgsfield DoP tier.",
  },
  {
    provider: "comfyui",
    modelId: "comfyui/wan2.2-i2v",
    label: "ComfyUI · Wan 2.2 TI2V (Colab / Cloud GPU)",
    route: "comfyui://wan2.2-i2v",
    tasks: ["i2v", "t2v"],
    qualityScore: 86,
    estimatedCostUsd: 0,
    isGpuWorker: true,
    notes: "Open-source Hugging Face Wan 2.2 running on your Colab/cloud GPU ($0 API spend).",
  },
  {
    provider: "huggingface",
    modelId: "hf/wan2.2-ti2v-5b",
    label: "Hugging Face Router · Wan 2.2 5B",
    route: "hf://Wan-AI/Wan2.2-TI2V-5B",
    tasks: ["i2v", "t2v"],
    qualityScore: 83,
    estimatedCostUsd: 0.05,
    notes: "Serverless Hugging Face inference provider route.",
  },
  {
    provider: "local_motion",
    modelId: "local/ffmpeg-camera-motion",
    label: "Local FFmpeg 2D Camera Motion (Fallback)",
    route: "local://ffmpeg-i2v",
    tasks: ["i2v"],
    qualityScore: 42,
    estimatedCostUsd: 0,
    isGpuWorker: false,
    notes: "Deterministic $0 2D push-in/pan fallback (not neural diffusion).",
  },

  // ── Text-to-Image (t2i) ──
  {
    provider: "higgsfield",
    modelId: "higgsfield/soul-standard",
    label: "Higgsfield Soul 2 Standard",
    route: "/higgsfield-ai/soul/standard",
    tasks: ["t2i"],
    qualityScore: 94,
    estimatedCostUsd: 0.12,
    notes: "High-aesthetic editorial photography & style catalog (paid API).",
  },
  {
    provider: "comfyui",
    modelId: "comfyui/flux-schnell-t2i",
    label: "ComfyUI · FLUX.1-schnell (Colab / Cloud GPU)",
    route: "comfyui://flux-schnell-t2i",
    tasks: ["t2i"],
    qualityScore: 88,
    estimatedCostUsd: 0,
    isGpuWorker: true,
    notes: "Fast open-weights FLUX on Colab/cloud GPU ($0 API spend).",
  },
  {
    provider: "huggingface",
    modelId: "hf/flux-schnell",
    label: "Hugging Face Router · FLUX.1-schnell",
    route: "hf://black-forest-labs/FLUX.1-schnell",
    tasks: ["t2i"],
    qualityScore: 87,
    estimatedCostUsd: 0.01,
    notes: "Low-cost serverless FLUX via Hugging Face Router.",
  },
  {
    provider: "local_motion",
    modelId: "local/ffmpeg-storyboard-plate",
    label: "Local FFmpeg Storyboard Plate (Fallback)",
    route: "local://ffmpeg-plate",
    tasks: ["t2i"],
    qualityScore: 25,
    estimatedCostUsd: 0,
    notes: "Deterministic $0 placeholder frame for offline end-to-end testing.",
  },

  // ── Character & Speak ──
  {
    provider: "higgsfield",
    modelId: "higgsfield/soul-character",
    label: "Higgsfield Soul Character",
    route: "/higgsfield-ai/soul/character",
    tasks: ["character"],
    qualityScore: 95,
    estimatedCostUsd: 0.14,
    notes: "Face-consistent Soul ID character generation.",
  },
  {
    provider: "higgsfield",
    modelId: "higgsfield/speak",
    label: "Higgsfield Speak Avatar",
    route: "/v1/speak/higgsfield",
    tasks: ["speak"],
    qualityScore: 93,
    estimatedCostUsd: 0.35,
    notes: "Audio-driven talking avatar.",
  },
];

export interface RouteRequest {
  task: TaskKind;
  strategy?: RouterStrategy;
  preferredProvider?: ProviderId;
  preferredRoute?: string;
  maxCostUsd?: number;
  allowLocalFallback?: boolean;
  /** Optional injected health map for deterministic testing. */
  healthMap?: Record<ProviderId, ProviderHealth>;
}

export class NoRouteAvailableError extends Error {
  readonly statusCode = 503;
  constructor(
    message: string,
    readonly candidates: RoutingCandidateAudit[]
  ) {
    super(message);
    this.name = "NoRouteAvailableError";
  }
}

function scoreCandidate(spec: RouteCandidateSpec, strategy: RouterStrategy): number {
  const costScore = Math.max(0, 100 - spec.estimatedCostUsd * 140);
  const gpuBonus = spec.isGpuWorker ? 22 : 0;

  switch (strategy) {
    case "quality":
      return round2(spec.qualityScore * 0.9 + costScore * 0.1);
    case "cost":
      return round2(costScore * 0.72 + spec.qualityScore * 0.28 + (spec.estimatedCostUsd === 0 ? 10 : 0));
    case "gpu_first":
      return round2(spec.qualityScore * 0.55 + costScore * 0.3 + gpuBonus);
    case "higgsfield_only":
    case "comfyui_only":
    case "balanced":
    default:
      return round2(spec.qualityScore * 0.62 + costScore * 0.38);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function selectRoute(req: RouteRequest): Promise<RoutingDecision> {
  const settings = getBudgetSettings();
  const strategy: RouterStrategy = req.strategy ?? settings.routerStrategy ?? "balanced";
  const healthMap = req.healthMap ?? (await checkAllProvidersHealth());
  const allowLocalFallback = req.allowLocalFallback ?? true;

  const taskCandidates = ROUTER_CATALOG.filter((c) => c.tasks.includes(req.task));
  const audits: RoutingCandidateAudit[] = [];

  for (const spec of taskCandidates) {
    const health = healthMap[spec.provider];
    let available = Boolean(health?.available);
    let reason: string | undefined = available ? undefined : (health?.detail ?? "Provider unavailable");

    if (available && !allowLocalFallback && spec.provider === "local_motion") {
      available = false;
      reason = "Local 2D fallback disabled for this request";
    }

    if (available && req.preferredProvider && spec.provider !== req.preferredProvider) {
      available = false;
      reason = `Filtered out by preferredProvider=${req.preferredProvider}`;
    }

    if (available && strategy === "higgsfield_only" && spec.provider !== "higgsfield") {
      available = false;
      reason = "Excluded by higgsfield_only strategy";
    }

    if (available && strategy === "comfyui_only" && spec.provider !== "comfyui") {
      available = false;
      reason = "Excluded by comfyui_only strategy";
    }

    if (available && req.maxCostUsd !== undefined && spec.estimatedCostUsd > req.maxCostUsd) {
      available = false;
      reason = `Estimated $${spec.estimatedCostUsd.toFixed(2)} exceeds maxCostUsd $${req.maxCostUsd.toFixed(2)}`;
    }

    if (available && spec.estimatedCostUsd > 0) {
      const afford = canAffordEstimatedSpend(spec.estimatedCostUsd);
      if (!afford.allowed) {
        available = false;
        reason = afford.reason ?? "Exceeds configured budget cap";
      }
    }

    // Factor in Higgsfield concurrency headroom as a mild score penalty when saturated
    let compositeScore = scoreCandidate(spec, strategy);
    if (available && spec.provider === "higgsfield") {
      const active = activeUpstreamCount("higgsfield");
      if (active >= maxConcurrency()) {
        compositeScore = round2(compositeScore - 15);
        reason = `Higgsfield queue full (${active}/${maxConcurrency()}); will wait locally`;
      }
    }

    if (available && req.preferredRoute && spec.route === req.preferredRoute) {
      compositeScore = round2(compositeScore + 25);
    }

    audits.push({
      provider: spec.provider,
      modelId: spec.modelId,
      label: spec.label,
      available,
      ...(reason ? { reason } : {}),
      qualityScore: spec.qualityScore,
      estimatedCostUsd: spec.estimatedCostUsd,
      compositeScore,
    });
  }

  const eligible = audits
    .filter((a) => a.available)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  if (eligible.length === 0) {
    throw new NoRouteAvailableError(
      `No available provider for task "${req.task}" under strategy "${strategy}". Configure Higgsfield keys, connect a ComfyUI Colab GPU worker, or set HUGGINGFACE_TOKEN.`,
      audits
    );
  }

  const winner = eligible[0];
  const spec = taskCandidates.find((c) => c.modelId === winner.modelId)!;

  return {
    task: req.task,
    strategy,
    selectedProvider: winner.provider,
    selectedModelId: winner.modelId,
    selectedRoute: req.preferredRoute && winner.provider === "higgsfield" ? req.preferredRoute : spec.route,
    estimatedCostUsd: winner.estimatedCostUsd,
    qualityScore: winner.qualityScore,
    reason:
      winner.provider === "local_motion"
        ? `Selected ${winner.label} as $0 local fallback because cloud/GPU providers were unavailable.`
        : `Selected ${winner.label} (${winner.provider}, quality ${winner.qualityScore}/100, est. $${winner.estimatedCostUsd.toFixed(2)}) under "${strategy}" strategy.`,
    candidates: audits,
    decidedAt: Date.now(),
  };
}
