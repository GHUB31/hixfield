import { getClient } from "@/lib/higgsfield/client";
import type { Motion, SoulStyle } from "@/lib/higgsfield/types";

/** Catalogs require auth, so they're fetched server-side and cached per boot. */
const TTL_MS = 30 * 60 * 1000;

interface CacheEntry<T> {
  at: number;
  data: T;
}

type GlobalCache = {
  __hfMotions?: CacheEntry<Motion[]>;
  __hfSoulStyles?: CacheEntry<SoulStyle[]>;
};
const g = globalThis as unknown as GlobalCache;

export async function getMotions(force = false): Promise<Motion[]> {
  if (!force && g.__hfMotions && Date.now() - g.__hfMotions.at < TTL_MS) {
    return g.__hfMotions.data;
  }
  const motions = (await getClient().getMotions()) as Motion[];
  g.__hfMotions = { at: Date.now(), data: motions };
  return motions;
}

export async function getSoulStyles(force = false): Promise<SoulStyle[]> {
  if (!force && g.__hfSoulStyles && Date.now() - g.__hfSoulStyles.at < TTL_MS) {
    return g.__hfSoulStyles.data;
  }
  const styles = (await getClient().getSoulStyles()) as SoulStyle[];
  g.__hfSoulStyles = { at: Date.now(), data: styles };
  return styles;
}
