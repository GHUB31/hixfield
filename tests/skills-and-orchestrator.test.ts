import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupercomputerOrchestrator } from "@/lib/agent/orchestrator";
import { closeDb, listPublishItems } from "@/lib/db";
import { HiggsfieldSupercomputerAdapter } from "@/lib/providers/higgsfield-agent";
import { LlmAdapter } from "@/lib/providers/llm";
import { invalidateProviderHealthCache } from "@/lib/providers/registry";
import {
  enhancePromptWithSkills,
  listHiggsfieldSkills,
  matchSkillsForBrief,
} from "@/lib/skills";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-test-agent-"));
  process.env.DATA_DIR = tmpDir;
  delete process.env.HF_API_KEY_ID;
  delete process.env.HF_API_KEY_SECRET;
  delete process.env.COMFYUI_BASE_URL;
  delete process.env.HUGGINGFACE_TOKEN;
  closeDb();
  invalidateProviderHealthCache();
});

afterEach(() => {
  closeDb();
  invalidateProviderHealthCache();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Higgsfield Open-Source Skills & Supercomputer Agent Orchestrator", () => {
  it("loads all 9 vendored MIT skills from higgsfield-ai/skills and enhances prompts", () => {
    const skills = listHiggsfieldSkills(true);
    expect(skills.length).toBe(9);
    expect(skills.map((s) => s.id)).toContain("higgsfield-generate");
    expect(skills.map((s) => s.id)).toContain("higgsfield-product-photoshoot");
    expect(skills.map((s) => s.id)).toContain("higgsfield-faceless-video");

    const matched = matchSkillsForBrief(
      "Launch a luxury skincare serum bottle with viral TikTok hooks and consistent studio lighting",
      "TikTok Shop product conversion"
    );
    expect(matched.map((s) => s.id)).toContain("higgsfield-product-photoshoot");
    expect(matched.map((s) => s.id)).toContain("higgsfield-faceless-video");

    const enhanced = enhancePromptWithSkills("Serum bottle on black marble", [
      "higgsfield-product-photoshoot",
      "higgsfield-generate",
    ]);
    expect(enhanced.enhancedPrompt).toContain("Art direction:");
    expect(enhanced.appliedSkills).toEqual(["higgsfield-product-photoshoot", "higgsfield-generate"]);
  });

  it("falls back from unauthorized official Supercomputer API to Vyolab orchestrator and queues pending_approval posts", async () => {
    process.env.HF_API_KEY_ID = "key";
    process.env.HF_API_KEY_SECRET = "secret";

    const mock403Fetch = vi.fn(async () => new Response("Agent API forbidden", { status: 403 }));
    const agentApi = new HiggsfieldSupercomputerAdapter({
      fetchImpl: mock403Fetch as unknown as typeof fetch,
    });
    const offlineLlm = new LlmAdapter({ config: null });

    // Remove HF keys before media routing so media uses local $0 fallback deterministically
    const orchestrator = new SupercomputerOrchestrator({ agentApi, llm: offlineLlm });

    // Probe happens first, then let's force strategy to cost so $0 local fallback produces real files
    const { campaign, publishQueue } = await orchestrator.runCampaign({
      brandName: "Vyolab Audio",
      brief:
        "Minimalist obsidian studio monitors engineered for nocturnal mastering rooms. Clean macro shots and bold short-form reveal.",
      platforms: ["tiktok", "instagram"],
      sceneCount: 2,
      strategy: "cost",
      autoGenerateMedia: true,
    });

    expect(campaign.status).toBe("completed");
    expect(campaign.engine).toBe("vyolab_orchestrator");
    expect(campaign.engineReason).toContain("unauthorized_403");
    expect(campaign.script?.hook).toContain("Vyolab Audio");
    expect(campaign.storyboard.length).toBe(2);
    expect(campaign.storyboard[0].videoAssetPath).toMatch(/\.mp4$/);
    expect(
      fs.existsSync(path.join(tmpDir, "assets", campaign.storyboard[0].videoAssetPath!))
    ).toBe(true);

    // Every generated post MUST require human approval
    expect(publishQueue.length).toBe(2);
    for (const post of publishQueue) {
      expect(post.approvalStatus).toBe("pending_approval");
      expect(post.publishStatus).toBe("draft");
      expect(post.approvedBy).toBeNull();
    }

    const storedQueue = listPublishItems({ campaignId: campaign.id });
    expect(storedQueue.length).toBe(2);
  });
});
