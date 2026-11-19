import fs from "node:fs";
import path from "node:path";
import { assetsDir, huggingFaceToken } from "@/lib/env";
import type { AssetRef } from "@/lib/higgsfield/types";
import type {
  CreativeProviderAdapter,
  ProviderHealth,
  ProviderPollResult,
  ProviderSubmitInput,
  ProviderSubmitResult,
} from "./types";

/**
 * Hugging Face Router / Inference Providers adapter.
 * Routes open-source Hugging Face models (e.g. FLUX.1-schnell, Wan2.2-TI2V-5B)
 * via https://router.huggingface.co with a server-side HUGGINGFACE_TOKEN.
 */

const HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference/models";

const MODEL_REPOS: Record<string, string> = {
  "hf/flux-schnell": "black-forest-labs/FLUX.1-schnell",
  "hf/wan2.2-ti2v-5b": "Wan-AI/Wan2.2-TI2V-5B",
  "hf/wan2.1-i2v-14b": "Wan-AI/Wan2.1-I2V-14B-480P",
};

export class HuggingFaceProviderAdapter implements CreativeProviderAdapter {
  readonly id = "huggingface" as const;
  readonly name = "Hugging Face Inference Router";
  readonly supportsTasks = ["t2i", "i2v", "t2v"] as const;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenOverride?: string | null;

  constructor(opts?: { fetchImpl?: typeof fetch; token?: string | null }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.tokenOverride = opts?.token;
  }

  private token(): string | null {
    if (this.tokenOverride !== undefined) return this.tokenOverride;
    return huggingFaceToken();
  }

  async healthCheck(): Promise<ProviderHealth> {
    const now = Date.now();
    const tok = this.token();
    if (!tok) {
      return {
        provider: this.id,
        name: this.name,
        configured: false,
        available: false,
        latencyMs: null,
        detail: "Set HUGGINGFACE_TOKEN server-side to enable Hugging Face Inference Router.",
        checkedAt: now,
      };
    }

    const start = Date.now();
    try {
      const res = await this.fetchImpl("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${tok}` },
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
          detail: `Hugging Face rejected token (HTTP ${res.status}).`,
          checkedAt: Date.now(),
        };
      }
      const info = (await res.json()) as { name?: string; isPro?: boolean };
      return {
        provider: this.id,
        name: this.name,
        configured: true,
        available: true,
        latencyMs,
        detail: `Authenticated as ${info.name ?? "HF user"}${info.isPro ? " (PRO)" : " (Free tier)"}.`,
        checkedAt: Date.now(),
        metadata: { username: info.name, isPro: Boolean(info.isPro) },
      };
    } catch (err) {
      return {
        provider: this.id,
        name: this.name,
        configured: true,
        available: false,
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
        checkedAt: Date.now(),
      };
    }
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    const tok = this.token();
    if (!tok) {
      throw new Error("HUGGINGFACE_TOKEN is not configured server-side.");
    }

    const repo = MODEL_REPOS[input.modelId] ?? MODEL_REPOS["hf/flux-schnell"];
    const url = `${HF_ROUTER_BASE}/${repo}`;
    const prompt = String(input.params.prompt ?? "cinematic studio frame, dramatic lighting");

    const body: Record<string, unknown> = { inputs: prompt };
    if (input.task === "i2v" && typeof input.params.image_url === "string") {
      body.parameters = { image_url: input.params.image_url };
    }

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 350);
      throw new Error(`Hugging Face Router HTTP ${res.status} on ${repo}: ${text}`);
    }

    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const bytes = Buffer.from(await res.arrayBuffer());
    const isVideo = mime.includes("video") || input.task === "i2v" || input.task === "t2v";
    const ext = mime.includes("mp4")
      ? "mp4"
      : mime.includes("jpeg")
        ? "jpg"
        : mime.includes("webp")
          ? "webp"
          : isVideo
            ? "mp4"
            : "png";

    const dir = path.join(assetsDir(), input.jobId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `0.${ext}`;
    fs.writeFileSync(path.join(dir, filename), bytes);

    const assets: AssetRef[] = [
      {
        path: `${input.jobId}/${filename}`,
        type: isVideo ? "video" : "image",
        source_url: url,
      },
    ];

    return {
      externalId: `hf:${repo}:${Date.now()}`,
      status: "completed",
      assets,
      actualUsd: isVideo ? 0.05 : 0.01,
    };
  }

  async poll(): Promise<ProviderPollResult> {
    return { status: "completed" };
  }
}

export const huggingFaceAdapter = new HuggingFaceProviderAdapter();
