import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Server-side environment accessors.
 * API keys and tokens MUST ONLY be read here on the server and NEVER serialized to the browser.
 */

/** The Higgsfield key pair, or null when the app runs without credentials. */
export function hfKeys(): { id: string; secret: string } | null {
  const combined = process.env.HF_KEY?.trim();
  if (combined && combined.includes(":")) {
    const idx = combined.indexOf(":");
    const id = combined.slice(0, idx).trim();
    const secret = combined.slice(idx + 1).trim();
    if (id && secret) return { id, secret };
  }
  const id = (process.env.HF_API_KEY_ID ?? process.env.HF_API_KEY)?.trim();
  const secret = (process.env.HF_API_KEY_SECRET ?? process.env.HF_API_SECRET)?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

export function hasKeys(): boolean {
  return hfKeys() !== null;
}

export function hfPlatformBaseUrl(): string {
  return (process.env.HF_PLATFORM_BASE_URL ?? "https://platform.higgsfield.ai").replace(/\/+$/, "");
}

export function hfAgentBaseUrl(): string {
  return (process.env.HF_AGENT_BASE_URL ?? "https://api.higgsfield.ai").replace(/\/+$/, "");
}

/**
 * The API rejects submissions over the plan's concurrency cap with HTTP 400,
 * so Vyolab queues locally and keeps at most this many jobs in flight.
 */
export function maxConcurrency(): number {
  const n = Number(process.env.HF_MAX_CONCURRENCY ?? 3);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 3;
}

export interface ComfyUiConfig {
  baseUrl: string;
  authHeader: string;
  authToken: string | null;
  defaultImageModel: string;
  defaultVideoModel: string;
}

export function comfyUiConfig(): ComfyUiConfig | null {
  const raw = process.env.COMFYUI_BASE_URL?.trim();
  if (!raw) return null;
  return {
    baseUrl: raw.replace(/\/+$/, ""),
    authHeader: process.env.COMFYUI_AUTH_HEADER?.trim() || "Authorization",
    authToken: process.env.COMFYUI_AUTH_TOKEN?.trim() || null,
    defaultImageModel: process.env.COMFYUI_IMAGE_MODEL?.trim() || "flux1-schnell-fp8.safetensors",
    defaultVideoModel: process.env.COMFYUI_VIDEO_MODEL?.trim() || "wan2.2_ti2v_5B_fp16.safetensors",
  };
}

/**
 * Hugging Face token for Inference Providers / Hugging Face Router.
 * Only reads ~/.cache/huggingface/token if HF_ALLOW_LOCAL_CACHE_TOKEN=true (opt-in for local dev).
 */
export function huggingFaceToken(): string | null {
  const envTok = (process.env.HUGGINGFACE_TOKEN ?? process.env.HF_TOKEN)?.trim();
  if (envTok) return envTok;
  if (process.env.HF_ALLOW_LOCAL_CACHE_TOKEN === "true") {
    try {
      const p = path.join(os.homedir(), ".cache", "huggingface", "token");
      if (fs.existsSync(p)) {
        const val = fs.readFileSync(p, "utf8").trim();
        if (val) return val;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export interface PostizConfig {
  baseUrl: string;
  apiKey: string;
}

export function postizConfig(): PostizConfig | null {
  const baseUrl = process.env.POSTIZ_BASE_URL?.trim();
  const apiKey = process.env.POSTIZ_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

export interface LlmConfig {
  provider: "openai_compatible" | "gemini" | "huggingface";
  apiUrl: string;
  apiKey: string;
  model: string;
}

export function llmConfig(): LlmConfig | null {
  const llmKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (llmKey) {
    return {
      provider: "openai_compatible",
      apiUrl: (process.env.LLM_API_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
      apiKey: llmKey,
      model: process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
    };
  }
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return {
      provider: "gemini",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    };
  }
  const hfTok = huggingFaceToken();
  if (hfTok && process.env.LLM_USE_HF_ROUTER === "true") {
    return {
      provider: "huggingface",
      apiUrl: "https://router.huggingface.co/v1",
      apiKey: hfTok,
      model: process.env.LLM_MODEL?.trim() || "Qwen/Qwen2.5-72B-Instruct",
    };
  }
  return null;
}

export type SupercomputerMode = "auto" | "official" | "local";

export function defaultSupercomputerMode(): SupercomputerMode {
  const raw = process.env.SUPERCOMPUTER_MODE?.trim().toLowerCase();
  if (raw === "official" || raw === "local" || raw === "auto") return raw;
  return "auto";
}

export function defaultDailyBudgetUsd(): number {
  const n = Number(process.env.DAILY_BUDGET_USD ?? 25);
  return Number.isFinite(n) && n >= 0 ? n : 25;
}

export function defaultMonthlyBudgetUsd(): number {
  const n = Number(process.env.MONTHLY_BUDGET_USD ?? 250);
  return Number.isFinite(n) && n >= 0 ? n : 250;
}

export function localMotionEnabled(): boolean {
  return process.env.ENABLE_LOCAL_MOTION_FALLBACK !== "false";
}

/** Root for the job database and downloaded assets (upstream URLs expire in ~7 days). */
export function dataDir(): string {
  return path.resolve(process.cwd(), process.env.DATA_DIR ?? "./data");
}

export function assetsDir(): string {
  return path.join(dataDir(), "assets");
}

export function skillsDir(): string {
  return path.resolve(process.cwd(), process.env.SKILLS_DIR ?? "./vendor/higgsfield-skills");
}

/** Public-safe summary of which server-side secrets are configured (NEVER returns values). */
export function secretPresenceSummary() {
  return {
    higgsfield: hasKeys(),
    comfyui: comfyUiConfig() !== null,
    huggingface: huggingFaceToken() !== null,
    postiz: postizConfig() !== null,
    llm: llmConfig() !== null,
    localMotion: localMotionEnabled(),
  };
}
