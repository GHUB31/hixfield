import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db";
import type { ProviderId } from "@/lib/higgsfield/types";
import type { ProviderHealth } from "@/lib/providers/types";
import { NoRouteAvailableError, selectRoute } from "@/lib/router";
import {
  assertBudgetAllowance,
  BudgetExceededError,
  getSpendSummary,
  refundSpend,
  reserveSpend,
  settleSpend,
  updateBudgetSettings,
} from "@/lib/spend";

function mockHealth(available: Partial<Record<ProviderId, boolean>>): Record<ProviderId, ProviderHealth> {
  const mk = (provider: ProviderId, name: string): ProviderHealth => ({
    provider,
    name,
    configured: Boolean(available[provider]),
    available: Boolean(available[provider]),
    latencyMs: available[provider] ? 12 : null,
    detail: available[provider] ? "ok" : "unavailable",
    checkedAt: Date.now(),
  });
  return {
    higgsfield: mk("higgsfield", "Higgsfield"),
    comfyui: mk("comfyui", "ComfyUI"),
    huggingface: mk("huggingface", "Hugging Face"),
    local_motion: mk("local_motion", "Local FFmpeg"),
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-test-router-"));
  process.env.DATA_DIR = tmpDir;
  closeDb();
});

afterEach(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Model Router & Spend Guardrails", () => {
  it("selects highest quality paid Higgsfield DoP under quality strategy", async () => {
    const decision = await selectRoute({
      task: "i2v",
      strategy: "quality",
      healthMap: mockHealth({ higgsfield: true, comfyui: true, huggingface: true, local_motion: true }),
    });
    expect(decision.selectedProvider).toBe("higgsfield");
    expect(decision.selectedModelId).toBe("higgsfield/dop-standard");
    expect(decision.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("prefers $0 ComfyUI Colab/Cloud GPU worker under gpu_first strategy", async () => {
    const decision = await selectRoute({
      task: "i2v",
      strategy: "gpu_first",
      healthMap: mockHealth({ higgsfield: true, comfyui: true, huggingface: true, local_motion: true }),
    });
    expect(decision.selectedProvider).toBe("comfyui");
    expect(decision.selectedModelId).toBe("comfyui/wan2.2-i2v");
    expect(decision.estimatedCostUsd).toBe(0);
  });

  it("blocks paid routes when daily budget cap is exceeded and fails over to $0 GPU", async () => {
    updateBudgetSettings({ dailyBudgetUsd: 0.2, monthlyBudgetUsd: 10 });
    reserveSpend({
      jobId: "job-prior",
      provider: "higgsfield",
      modelId: "higgsfield/dop-lite",
      estimatedUsd: 0.15,
    });
    settleSpend("job-prior", { actualUsd: 0.15 });

    // Remaining daily budget is $0.05 -> Higgsfield DoP Standard ($0.45) & Lite ($0.14) are blocked
    const decision = await selectRoute({
      task: "i2v",
      strategy: "quality",
      healthMap: mockHealth({ higgsfield: true, comfyui: true, local_motion: true }),
    });
    expect(decision.selectedProvider).toBe("comfyui");
    const hfAudit = decision.candidates.find((c) => c.modelId === "higgsfield/dop-standard");
    expect(hfAudit?.available).toBe(false);
    expect(hfAudit?.reason).toContain("exceeds daily cap");
  });

  it("enforces hard budget cap and refunds failed jobs cleanly", () => {
    updateBudgetSettings({ dailyBudgetUsd: 1.0, monthlyBudgetUsd: 10 });
    reserveSpend({
      jobId: "job-1",
      provider: "higgsfield",
      modelId: "higgsfield/dop-standard",
      estimatedUsd: 0.8,
    });

    expect(() => assertBudgetAllowance(0.5)).toThrow(BudgetExceededError);

    refundSpend("job-1");
    const summary = getSpendSummary();
    expect(summary.dailySpentUsd).toBe(0);
    expect(() => assertBudgetAllowance(0.5)).not.toThrow();
  });

  it("throws NoRouteAvailableError when no provider satisfies constraints", async () => {
    await expect(
      selectRoute({
        task: "i2v",
        strategy: "comfyui_only",
        healthMap: mockHealth({ higgsfield: true, comfyui: false }),
      })
    ).rejects.toThrow(NoRouteAvailableError);
  });
});
