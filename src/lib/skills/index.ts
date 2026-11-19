import fs from "node:fs";
import path from "node:path";
import { skillsDir } from "@/lib/env";

/**
 * Loader & prompt-enhancement engine for the vendored MIT-licensed
 * Higgsfield Open-Source Agent Skills (https://github.com/higgsfield-ai/skills).
 */

export interface HiggsfieldSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  sourceRepo: string;
  category: "video" | "image" | "brand" | "character" | "marketing" | "web";
  recommendedModels: string[];
  promptGuidance: string[];
  references: string[];
  markdownPreview: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  let currentKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      const val = kv[2].replace(/^["'>|]\s*/, "").replace(/["']$/, "").trim();
      meta[currentKey] = val;
    } else if (currentKey && /^\s+/.test(line)) {
      meta[currentKey] = `${meta[currentKey]} ${line.trim()}`.trim();
    }
  }
  return { meta, body: match[2] };
}

function inferCategory(id: string): HiggsfieldSkill["category"] {
  if (id.includes("brand")) return "brand";
  if (id.includes("soul-id")) return "character";
  if (id.includes("photoshoot") || id.includes("thumbnail") || id.includes("marketplace")) return "image";
  if (id.includes("video") || id.includes("explainer")) return "video";
  if (id.includes("website")) return "web";
  return "marketing";
}

function extractRecommendedModels(body: string): string[] {
  const known = [
    "seedance_2_5",
    "dop",
    "kling3_0_turbo",
    "veo3.1",
    "nano_banana_flash",
    "nano_banana_pro",
    "gpt_image_2_6",
    "soul",
    "flux",
    "seed_audio",
  ];
  const lower = body.toLowerCase();
  return known.filter((m) => lower.includes(m.toLowerCase())).slice(0, 5);
}

function extractGuidanceBullets(body: string): string[] {
  const bullets: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.{18,180})$/);
    if (m) {
      const cleaned = m[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
      if (!cleaned.startsWith("http") && !cleaned.startsWith("[")) {
        bullets.push(cleaned);
      }
    }
    if (bullets.length >= 6) break;
  }
  return bullets;
}

type GlobalCache = { __vyolabSkills?: { dir: string; skills: HiggsfieldSkill[] } };
const g = globalThis as unknown as GlobalCache;

export function listHiggsfieldSkills(force = false): HiggsfieldSkill[] {
  const dir = skillsDir();
  if (!force && g.__vyolabSkills && g.__vyolabSkills.dir === dir) {
    return g.__vyolabSkills.skills;
  }
  if (!fs.existsSync(dir)) return [];

  const versionPath = path.join(dir, "VERSION");
  const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, "utf8").trim() : "0.14.0";

  const skills: HiggsfieldSkill[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("higgsfield-")) continue;
    const skillFile = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    const raw = fs.readFileSync(skillFile, "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const refsDir = path.join(dir, entry.name, "references");
    const references = fs.existsSync(refsDir)
      ? fs.readdirSync(refsDir).filter((f) => f.endsWith(".md"))
      : [];

    skills.push({
      id: entry.name,
      name: meta.name || entry.name,
      description: meta.description || `Higgsfield open-source skill: ${entry.name}`,
      version,
      sourceRepo: "https://github.com/higgsfield-ai/skills",
      category: inferCategory(entry.name),
      recommendedModels: extractRecommendedModels(body),
      promptGuidance: extractGuidanceBullets(body),
      references,
      markdownPreview: body.trim().slice(0, 1400),
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  g.__vyolabSkills = { dir, skills };
  return skills;
}

export function getHiggsfieldSkill(id: string): HiggsfieldSkill | null {
  return listHiggsfieldSkills().find((s) => s.id === id) ?? null;
}

/**
 * Matches the most relevant open-source Higgsfield skills for a given brand brief & objective.
 */
export function matchSkillsForBrief(brief: string, objective = ""): HiggsfieldSkill[] {
  const all = listHiggsfieldSkills();
  if (all.length === 0) return [];
  const text = `${brief} ${objective}`.toLowerCase();

  const scored = all.map((skill) => {
    let score = 0;
    if (skill.id === "higgsfield-generate") score += 3;
    if (skill.id === "higgsfield-product-photoshoot" && /(product|bottle|shoe|watch|skincare|pack|ecommerce|studio|shop)/.test(text))
      score += 6;
    if (skill.id === "higgsfield-brandkit" && /(brand|identity|launch|logo|palette|campaign|visual)/.test(text))
      score += 5;
    if (skill.id === "higgsfield-faceless-video" && /(tiktok|reels|shorts|faceless|story|hook|narration|viral|ugc)/.test(text))
      score += 6;
    if (skill.id === "higgsfield-video-explainer" && /(explainer|demo|saas|how it works|tutorial|walkthrough)/.test(text))
      score += 6;
    if (skill.id === "higgsfield-soul-id" && /(character|founder|mascot|presenter|face|consistent|persona)/.test(text))
      score += 6;
    if (skill.id === "higgsfield-youtube-thumbnail" && /(youtube|thumbnail|cover|shorts)/.test(text))
      score += 5;
    if (skill.id === "higgsfield-marketplace-cards" && /(amazon|shopify|marketplace|listing|card)/.test(text))
      score += 5;
    return { skill, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.skill);
}

/**
 * Enriches a raw user prompt with structured cinematography, lighting, and consistency rules
 * distilled from the selected Higgsfield open-source skills.
 */
export function enhancePromptWithSkills(
  rawPrompt: string,
  skillIds: string[]
): { enhancedPrompt: string; appliedSkills: string[]; appliedRules: string[] } {
  const selected = skillIds
    .map((id) => getHiggsfieldSkill(id))
    .filter((s): s is HiggsfieldSkill => s !== null);

  if (selected.length === 0) {
    return { enhancedPrompt: rawPrompt.trim(), appliedSkills: [], appliedRules: [] };
  }

  const rules: string[] = [];
  for (const s of selected) {
    if (s.id === "higgsfield-product-photoshoot") {
      rules.push("commercial studio lighting, sharp product silhouette, tactile surface reflections, uncluttered negative space");
    } else if (s.id === "higgsfield-faceless-video") {
      rules.push("high-contrast opening visual hook in first 1.5s, dynamic camera movement, vertical-safe subject framing");
    } else if (s.id === "higgsfield-brandkit") {
      rules.push("cohesive brand color harmony, disciplined typography-free clean plate, editorial art direction");
    } else if (s.id === "higgsfield-soul-id") {
      rules.push("consistent facial geometry, natural skin texture, matched wardrobe and lighting continuity across shots");
    } else if (s.id === "higgsfield-video-explainer") {
      rules.push("clear focal hierarchy, deliberate camera glide, crisp foreground-background separation");
    } else if (s.id === "higgsfield-generate") {
      rules.push("35mm cinema lens depth of field, motivated practical light, filmic color grade, zero text artifacts");
    }
  }

  const uniqueRules = Array.from(new Set(rules)).slice(0, 3);
  const base = rawPrompt.trim();
  const enhancedPrompt =
    uniqueRules.length > 0 ? `${base}. Art direction: ${uniqueRules.join("; ")}.` : base;

  return {
    enhancedPrompt,
    appliedSkills: selected.map((s) => s.id),
    appliedRules: uniqueRules,
  };
}
