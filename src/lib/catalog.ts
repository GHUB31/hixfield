import { hasKeys } from "@/lib/env";
import { getClient } from "@/lib/higgsfield/client";
import type { Motion, SoulStyle } from "@/lib/higgsfield/types";

/** Catalogs require auth for live Higgsfield entries; curated local cinema previews load immediately when keyless. */
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

export const LOCAL_PREVIEW_MOTIONS: Motion[] = [
  {
    id: "preview-dolly-in",
    name: "Dolly In",
    description: "Slow cinematic push into the hero subject with shallow focus",
    preview_url: "/media/hero-loop.mp4",
    poster_url: "/media/hero-soundstage.webp",
    category: "Dolly & Push",
    start_end_frame: true,
  },
  {
    id: "preview-brutalist-push",
    name: "Architectural Push",
    description: "Steadicam forward glide through deep obsidian space",
    preview_url: "/media/hall-loop.mp4",
    poster_url: "/media/hall-wide.webp",
    category: "Dolly & Push",
    start_end_frame: true,
  },
  {
    id: "preview-handheld-parallax",
    name: "Handheld Drift",
    description: "Organic 35mm handheld parallax with subtle horizon float",
    preview_url: "/media/neon-loop.mp4",
    poster_url: "/media/gallery-neon.webp",
    category: "Handheld",
    start_end_frame: false,
  },
  {
    id: "preview-macro-rack",
    name: "Macro Rack Focus",
    description: "Tight anamorphic close-up pulling sharp across surface texture",
    preview_url: "/media/hero-loop.mp4",
    poster_url: "/media/lens-macro.webp",
    category: "Macro",
    start_end_frame: true,
  },
  {
    id: "preview-pan-right",
    name: "Lateral Track Right",
    description: "Precision slider track gliding left-to-right across the set",
    preview_url: "/media/hall-loop.mp4",
    poster_url: "/media/gallery-luxury.webp",
    category: "Orbit & Track",
    start_end_frame: true,
  },
  {
    id: "preview-orbit-arc",
    name: "360 Studio Orbit",
    description: "Smooth rotational arc sweeping around the centerpiece",
    preview_url: "/media/neon-loop.mp4",
    poster_url: "/media/gallery-party.webp",
    category: "Orbit & Track",
    start_end_frame: false,
  },
  {
    id: "preview-pull-out",
    name: "Hero Pull Out",
    description: "Measured dolly-back reveal opening into the full environment",
    preview_url: "/media/hall-loop.mp4",
    poster_url: "/media/gallery-y2k.webp",
    category: "Dolly & Push",
    start_end_frame: true,
  },
  {
    id: "preview-cctv-drift",
    name: "Surveillance Pan",
    description: "Locked security-lens sweep with moody nocturnal contrast",
    preview_url: "/media/neon-loop.mp4",
    poster_url: "/media/gallery-cctv.webp",
    category: "Handheld",
    start_end_frame: false,
  },
];

export const LOCAL_PREVIEW_STYLES: SoulStyle[] = [
  {
    id: "style-neon-noir",
    name: "Neon Noir",
    description: "Rain-slick reflections, practical tungsten and nocturnal contrast",
    preview_url: "/media/gallery-neon.webp",
    category: "Editorial",
  },
  {
    id: "style-quiet-luxury",
    name: "Quiet Luxury",
    description: "Soft architectural daylight, cashmere neutrals, editorial grain",
    preview_url: "/media/gallery-luxury.webp",
    category: "Fashion",
  },
  {
    id: "style-y2k-digicam",
    name: "Y2K Digicam",
    description: "Direct on-camera flash, compact CCD texture, candid framing",
    preview_url: "/media/gallery-y2k.webp",
    category: "Analog",
  },
  {
    id: "style-party-flash",
    name: "Party Flash",
    description: "Hard 35mm point-and-shoot flash with kinetic motion blur",
    preview_url: "/media/gallery-party.webp",
    category: "Analog",
  },
  {
    id: "style-cctv-grain",
    name: "CCTV Monochrome",
    description: "Wide security-angle framing with crisp shadow rolloff",
    preview_url: "/media/gallery-cctv.webp",
    category: "Cinema",
  },
  {
    id: "style-soundstage",
    name: "Anamorphic Soundstage",
    description: "Volumetric haze, single motivated key light, widescreen grade",
    preview_url: "/media/hero-soundstage.webp",
    category: "Cinema",
  },
  {
    id: "style-brutalist",
    name: "Brutalist Monolith",
    description: "Monumental concrete geometry with cool slate atmosphere",
    preview_url: "/media/hall-wide.webp",
    category: "Architecture",
  },
  {
    id: "style-macro-optics",
    name: "35mm Cinema Macro",
    description: "Razor-thin depth of field and tactile optical speculars",
    preview_url: "/media/lens-macro.webp",
    category: "Product",
  },
];

export async function getMotionsWithSource(force = false): Promise<{
  motions: Motion[];
  source: "higgsfield_live" | "local_preview";
}> {
  if (!hasKeys()) {
    return { motions: LOCAL_PREVIEW_MOTIONS, source: "local_preview" };
  }
  if (!force && g.__hfMotions && Date.now() - g.__hfMotions.at < TTL_MS) {
    return { motions: g.__hfMotions.data, source: "higgsfield_live" };
  }
  const motions = (await getClient().getMotions()) as Motion[];
  g.__hfMotions = { at: Date.now(), data: motions };
  return { motions, source: "higgsfield_live" };
}

export async function getMotions(force = false): Promise<Motion[]> {
  const { motions } = await getMotionsWithSource(force);
  return motions;
}

export async function getSoulStylesWithSource(force = false): Promise<{
  styles: SoulStyle[];
  source: "higgsfield_live" | "local_preview";
}> {
  if (!hasKeys()) {
    return { styles: LOCAL_PREVIEW_STYLES, source: "local_preview" };
  }
  if (!force && g.__hfSoulStyles && Date.now() - g.__hfSoulStyles.at < TTL_MS) {
    return { styles: g.__hfSoulStyles.data, source: "higgsfield_live" };
  }
  const styles = (await getClient().getSoulStyles()) as SoulStyle[];
  g.__hfSoulStyles = { at: Date.now(), data: styles };
  return { styles, source: "higgsfield_live" };
}

export async function getSoulStyles(force = false): Promise<SoulStyle[]> {
  const { styles } = await getSoulStylesWithSource(force);
  return styles;
}
