import type { ProviderId } from "@/lib/higgsfield/types";
import { comfyUiAdapter } from "./comfyui";
import { higgsfieldAdapter } from "./higgsfield";
import { huggingFaceAdapter } from "./huggingface";
import { localMotionAdapter } from "./local-motion";
import type { CreativeProviderAdapter, ProviderHealth } from "./types";

const ADAPTERS: Record<ProviderId, CreativeProviderAdapter> = {
  higgsfield: higgsfieldAdapter,
  comfyui: comfyUiAdapter,
  huggingface: huggingFaceAdapter,
  local_motion: localMotionAdapter,
};

export function getProviderAdapter(id: ProviderId): CreativeProviderAdapter {
  return ADAPTERS[id];
}

export function listProviderAdapters(): CreativeProviderAdapter[] {
  return Object.values(ADAPTERS);
}

interface HealthCache {
  at: number;
  results: Record<ProviderId, ProviderHealth>;
}

type GlobalCache = { __vyolabProviderHealth?: HealthCache };
const g = globalThis as unknown as GlobalCache;
const HEALTH_TTL_MS = 15_000;

export async function checkAllProvidersHealth(force = false): Promise<Record<ProviderId, ProviderHealth>> {
  if (!force && g.__vyolabProviderHealth && Date.now() - g.__vyolabProviderHealth.at < HEALTH_TTL_MS) {
    return g.__vyolabProviderHealth.results;
  }
  const entries = await Promise.all(
    listProviderAdapters().map(async (adapter) => [adapter.id, await adapter.healthCheck()] as const)
  );
  const results = Object.fromEntries(entries) as Record<ProviderId, ProviderHealth>;
  g.__vyolabProviderHealth = { at: Date.now(), results };
  return results;
}

export function invalidateProviderHealthCache(): void {
  g.__vyolabProviderHealth = undefined;
}
