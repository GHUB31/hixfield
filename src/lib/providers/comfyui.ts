import fs from "node:fs";
import path from "node:path";
import { assetsDir, comfyUiConfig, type ComfyUiConfig } from "@/lib/env";
import type { AssetRef } from "@/lib/higgsfield/types";
import type {
  CreativeProviderAdapter,
  ProviderHealth,
  ProviderPollResult,
  ProviderSubmitInput,
  ProviderSubmitResult,
} from "./types";

/**
 * ComfyUI Adapter for Hugging Face open-source models running on Google Colab,
 * RunPod, Modal, or local GPU workers.
 *
 * Uses ComfyUI's native REST API:
 *   GET  /system_stats
 *   POST /upload/image
 *   POST /prompt
 *   GET  /history/{prompt_id}
 *   GET  /view?filename=...&subfolder=...&type=...
 */

export interface ComfyUiWorkflowGraph {
  [nodeId: string]: {
    class_type: string;
    inputs: Record<string, unknown>;
  };
}

export function buildFluxSchnellWorkflow(params: {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  checkpoint?: string;
}): ComfyUiWorkflowGraph {
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000) + 1;
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: params.checkpoint ?? "flux1-schnell-fp8.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.negativePrompt ?? "blurry, distorted, low quality", clip: ["1", 1] },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width ?? 1024, height: params.height ?? 1024, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: params.steps ?? 4,
        cfg: 1.0,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "vyolab_flux", images: ["6", 0] },
    },
  };
}

export function buildWanI2vWorkflow(params: {
  imageName: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  frames?: number;
  fps?: number;
  seed?: number;
  modelName?: string;
}): ComfyUiWorkflowGraph {
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000) + 1;
  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: params.imageName },
    },
    "2": {
      class_type: "UNETLoader",
      inputs: { unet_name: params.modelName ?? "wan2.2_ti2v_5B_fp16.safetensors", weight_dtype: "default" },
    },
    "3": {
      class_type: "CLIPLoader",
      inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan" },
    },
    "4": {
      class_type: "VAELoader",
      inputs: { vae_name: "wan2.2_vae.safetensors" },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt || "cinematic camera motion, crisp detail, natural lighting", clip: ["3", 0] },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.negativePrompt ?? "static, jitter, flicker, watermark, text artifacts, distorted",
        clip: ["3", 0],
      },
    },
    "7": {
      class_type: "Wan22ImageToVideoLatent",
      inputs: {
        vae: ["4", 0],
        start_image: ["1", 0],
        width: params.width ?? 768,
        height: params.height ?? 512,
        length: params.frames ?? 49,
        batch_size: 1,
      },
    },
    "8": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 20,
        cfg: 5.0,
        sampler_name: "uni_pc",
        scheduler: "simple",
        denoise: 1.0,
        model: ["2", 0],
        positive: ["5", 0],
        negative: ["6", 0],
        latent_image: ["7", 0],
      },
    },
    "9": {
      class_type: "VAEDecode",
      inputs: { samples: ["8", 0], vae: ["4", 0] },
    },
    "10": {
      class_type: "CreateVideo",
      inputs: { images: ["9", 0], fps: params.fps ?? 16 },
    },
    "11": {
      class_type: "SaveVideo",
      inputs: { video: ["10", 0], filename_prefix: "vyolab_wan_i2v", format: "mp4", codec: "h264" },
    },
  };
}

export class ComfyUiProviderAdapter implements CreativeProviderAdapter {
  readonly id = "comfyui" as const;
  readonly name = "ComfyUI (Colab / Cloud GPU · Hugging Face)";
  readonly supportsTasks = ["i2v", "t2i", "t2v"] as const;
  private readonly fetchImpl: typeof fetch;
  private readonly configOverride?: ComfyUiConfig | null;

  constructor(opts?: { fetchImpl?: typeof fetch; config?: ComfyUiConfig | null }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.configOverride = opts?.config;
  }

  private getConfig(): ComfyUiConfig | null {
    if (this.configOverride !== undefined) return this.configOverride;
    return comfyUiConfig();
  }

  private headers(cfg: ComfyUiConfig): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    if (cfg.authToken) {
      h[cfg.authHeader] =
        cfg.authHeader.toLowerCase() === "authorization" && !cfg.authToken.startsWith("Bearer ")
          ? `Bearer ${cfg.authToken}`
          : cfg.authToken;
    }
    return h;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const now = Date.now();
    const cfg = this.getConfig();
    if (!cfg) {
      return {
        provider: this.id,
        name: this.name,
        configured: false,
        available: false,
        latencyMs: null,
        detail:
          "Set COMFYUI_BASE_URL to connect a Colab or cloud GPU ComfyUI worker (see colab/vyolab_comfyui_worker.ipynb).",
        checkedAt: now,
      };
    }

    const start = Date.now();
    try {
      const res = await this.fetchImpl(`${cfg.baseUrl}/system_stats`, {
        headers: this.headers(cfg),
        signal: AbortSignal.timeout(5_000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return {
          provider: this.id,
          name: this.name,
          configured: true,
          available: false,
          latencyMs,
          detail: `ComfyUI returned HTTP ${res.status} at ${cfg.baseUrl}.`,
          checkedAt: Date.now(),
        };
      }
      const stats = (await res.json()) as {
        devices?: Array<{ name?: string; vram_total?: number; vram_free?: number }>;
      };
      const gpu = stats.devices?.[0];
      const vramGb = gpu?.vram_total ? `${(gpu.vram_total / 1024 ** 3).toFixed(1)} GB VRAM` : "GPU ready";
      return {
        provider: this.id,
        name: this.name,
        configured: true,
        available: true,
        latencyMs,
        detail: gpu?.name ? `${gpu.name} (${vramGb})` : `Connected to ${cfg.baseUrl}`,
        checkedAt: Date.now(),
        metadata: { baseUrl: cfg.baseUrl, devices: stats.devices ?? [] },
      };
    } catch (err) {
      return {
        provider: this.id,
        name: this.name,
        configured: true,
        available: false,
        latencyMs: Date.now() - start,
        detail: `ComfyUI unreachable at ${cfg.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        checkedAt: Date.now(),
      };
    }
  }

  private async uploadSourceImage(cfg: ComfyUiConfig, imageUrl: string): Promise<string> {
    let bytes: Buffer;
    let filename = "input.png";
    let mime = "image/png";

    if (imageUrl.startsWith("/api/assets/")) {
      const rel = imageUrl.replace(/^\/api\/assets\//, "");
      const localPath = path.resolve(assetsDir(), rel);
      bytes = fs.readFileSync(localPath);
      filename = path.basename(localPath);
      if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) mime = "image/jpeg";
      else if (filename.endsWith(".webp")) mime = "image/webp";
    } else {
      const res = await this.fetchImpl(imageUrl);
      if (!res.ok) throw new Error(`Failed to fetch source image (${res.status}) for ComfyUI upload`);
      bytes = Buffer.from(await res.arrayBuffer());
      mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
      const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
      filename = `vyolab_src_${Date.now()}.${ext}`;
    }

    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
    form.append("overwrite", "true");

    const uploadRes = await this.fetchImpl(`${cfg.baseUrl}/upload/image`, {
      method: "POST",
      headers: this.headers(cfg),
      body: form,
    });
    if (!uploadRes.ok) {
      throw new Error(`ComfyUI /upload/image failed (HTTP ${uploadRes.status})`);
    }
    const uploaded = (await uploadRes.json()) as { name: string };
    return uploaded.name;
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error("ComfyUI is not configured. Set COMFYUI_BASE_URL server-side.");
    }

    const prompt = String(input.params.prompt ?? "");
    const seed = typeof input.params.seed === "number" ? input.params.seed : undefined;
    let workflow: ComfyUiWorkflowGraph;

    if (input.task === "i2v") {
      const imageUrl = String(input.params.image_url ?? "");
      if (!imageUrl) throw new Error("ComfyUI image-to-video requires image_url.");
      const uploadedName = await this.uploadSourceImage(cfg, imageUrl);
      workflow = buildWanI2vWorkflow({
        imageName: uploadedName,
        prompt,
        seed,
        modelName: cfg.defaultVideoModel,
      });
    } else {
      workflow = buildFluxSchnellWorkflow({
        prompt: prompt || "cinematic studio frame, crisp lighting",
        seed,
        checkpoint: cfg.defaultImageModel,
      });
    }

    const res = await this.fetchImpl(`${cfg.baseUrl}/prompt`, {
      method: "POST",
      headers: { ...this.headers(cfg), "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: `vyolab-${input.jobId}` }),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`ComfyUI /prompt failed (HTTP ${res.status}): ${text}`);
    }
    const queued = (await res.json()) as { prompt_id: string };
    return {
      externalId: queued.prompt_id,
      status: "queued",
      actualUsd: 0,
    };
  }

  async poll(externalId: string, _route: string, jobId: string): Promise<ProviderPollResult> {
    const cfg = this.getConfig();
    if (!cfg) {
      return { status: "failed", error: "COMFYUI_BASE_URL is no longer configured." };
    }

    const res = await this.fetchImpl(`${cfg.baseUrl}/history/${encodeURIComponent(externalId)}`, {
      headers: this.headers(cfg),
    });
    if (!res.ok) {
      return { status: "failed", error: `ComfyUI /history returned HTTP ${res.status}` };
    }
    const history = (await res.json()) as Record<
      string,
      {
        status?: { status_str?: string; completed?: boolean; messages?: unknown[] };
        outputs?: Record<
          string,
          {
            images?: Array<{ filename: string; subfolder?: string; type?: string }>;
            videos?: Array<{ filename: string; subfolder?: string; type?: string }>;
            gifs?: Array<{ filename: string; subfolder?: string; type?: string }>;
          }
        >;
      }
    >;

    const entry = history[externalId];
    if (!entry) {
      return { status: "in_progress" };
    }

    if (entry.status?.status_str === "error") {
      return {
        status: "failed",
        error: `ComfyUI execution error on prompt ${externalId}.`,
      };
    }

    const files: Array<{ filename: string; subfolder: string; type: string; kind: "video" | "image" }> = [];
    for (const nodeOut of Object.values(entry.outputs ?? {})) {
      for (const v of nodeOut.videos ?? nodeOut.gifs ?? []) {
        files.push({
          filename: v.filename,
          subfolder: v.subfolder ?? "",
          type: v.type ?? "output",
          kind: "video",
        });
      }
      for (const img of nodeOut.images ?? []) {
        files.push({
          filename: img.filename,
          subfolder: img.subfolder ?? "",
          type: img.type ?? "output",
          kind: "image",
        });
      }
    }

    if (files.length === 0) {
      return entry.status?.completed
        ? { status: "failed", error: "ComfyUI completed without output media." }
        : { status: "in_progress" };
    }

    const dir = path.join(assetsDir(), jobId);
    fs.mkdirSync(dir, { recursive: true });
    const assets: AssetRef[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const qs = new URLSearchParams({
        filename: f.filename,
        subfolder: f.subfolder,
        type: f.type,
      });
      const viewUrl = `${cfg.baseUrl}/view?${qs.toString()}`;
      const dl = await this.fetchImpl(viewUrl, { headers: this.headers(cfg) });
      if (!dl.ok) {
        throw new Error(`ComfyUI /view download failed (${dl.status}) for ${f.filename}`);
      }
      const bytes = Buffer.from(await dl.arrayBuffer());
      const ext = path.extname(f.filename).replace(".", "").toLowerCase() || (f.kind === "video" ? "mp4" : "png");
      const outName = `${i}.${ext}`;
      fs.writeFileSync(path.join(dir, outName), bytes);
      assets.push({
        path: `${jobId}/${outName}`,
        type: ["mp4", "webm", "mov"].includes(ext) ? "video" : "image",
        source_url: viewUrl,
      });
    }

    return { status: "completed", assets, actualUsd: 0 };
  }
}

export const comfyUiAdapter = new ComfyUiProviderAdapter();
