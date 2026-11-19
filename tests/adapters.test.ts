import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "@/lib/db";
import type { PublishQueueRecord } from "@/lib/higgsfield/types";
import { buildWanI2vWorkflow, ComfyUiProviderAdapter } from "@/lib/providers/comfyui";
import { HiggsfieldSupercomputerAdapter } from "@/lib/providers/higgsfield-agent";
import { HuggingFaceProviderAdapter } from "@/lib/providers/huggingface";
import { PostizAdapter, PublishingApprovalRequiredError } from "@/lib/providers/postiz";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-test-adapters-"));
  process.env.DATA_DIR = tmpDir;
  closeDb();
});

afterEach(() => {
  closeDb();
  delete process.env.HF_API_KEY_ID;
  delete process.env.HF_API_KEY_SECRET;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Provider Adapters", () => {
  it("HiggsfieldSupercomputerAdapter distinguishes 403 unauthorized from 200 authorized", async () => {
    process.env.HF_API_KEY_ID = "test-id";
    process.env.HF_API_KEY_SECRET = "test-secret";

    const deniedFetch = vi.fn(async () => new Response("Agent API requires enterprise entitlement", { status: 403 }));
    const deniedAdapter = new HiggsfieldSupercomputerAdapter({ fetchImpl: deniedFetch as unknown as typeof fetch });
    const deniedProbe = await deniedAdapter.probeAccess();
    expect(deniedProbe.authorized).toBe(false);
    expect(deniedProbe.status).toBe("unauthorized_403");
    expect(deniedProbe.httpStatus).toBe(403);

    const okFetch = vi.fn(async () =>
      new Response(JSON.stringify({ session_id: "sess-123", status: "idle" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const okAdapter = new HiggsfieldSupercomputerAdapter({ fetchImpl: okFetch as unknown as typeof fetch });
    const okProbe = await okAdapter.probeAccess();
    expect(okProbe.authorized).toBe(true);
    expect(okProbe.sessionId).toBe("sess-123");
  });

  it("ComfyUiProviderAdapter submits Wan 2.2 I2V graph and downloads output video", async () => {
    const wf = buildWanI2vWorkflow({ imageName: "hero.png", prompt: "slow push in" });
    expect(wf["1"].class_type).toBe("LoadImage");
    expect(wf["7"].class_type).toBe("Wan22ImageToVideoLatent");
    expect(wf["11"].class_type).toBe("SaveVideo");

    // Seed local asset to upload to ComfyUI
    const uploadDir = path.join(tmpDir, "assets", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, "frame.png"), Buffer.from([137, 80, 78, 71]));

    const mockFetch = vi.fn(async (url: string | URL) => {
      const s = String(url);
      if (s.endsWith("/system_stats")) {
        return new Response(
          JSON.stringify({ devices: [{ name: "Tesla T4", vram_total: 16 * 1024 ** 3 }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (s.endsWith("/upload/image")) {
        return new Response(JSON.stringify({ name: "frame.png" }), { status: 200 });
      }
      if (s.endsWith("/prompt")) {
        return new Response(JSON.stringify({ prompt_id: "comfy-prompt-77" }), { status: 200 });
      }
      if (s.includes("/history/comfy-prompt-77")) {
        return new Response(
          JSON.stringify({
            "comfy-prompt-77": {
              status: { status_str: "success", completed: true },
              outputs: {
                "11": { videos: [{ filename: "vyolab_wan_0001.mp4", subfolder: "", type: "output" }] },
              },
            },
          }),
          { status: 200 }
        );
      }
      if (s.includes("/view?")) {
        return new Response(Buffer.from("FAKE_MP4_BYTES"), {
          status: 200,
          headers: { "Content-Type": "video/mp4" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    const adapter = new ComfyUiProviderAdapter({
      fetchImpl: mockFetch as unknown as typeof fetch,
      config: {
        baseUrl: "https://colab-gpu.example.com",
        authHeader: "Authorization",
        authToken: "secret-token",
        defaultImageModel: "flux1-schnell-fp8.safetensors",
        defaultVideoModel: "wan2.2_ti2v_5B_fp16.safetensors",
      },
    });

    const health = await adapter.healthCheck();
    expect(health.available).toBe(true);
    expect(health.detail).toContain("Tesla T4");

    const submitted = await adapter.submit({
      jobId: "job-comfy-1",
      task: "i2v",
      route: "comfyui://wan2.2-i2v",
      modelId: "comfyui/wan2.2-i2v",
      params: { image_url: "/api/assets/uploads/frame.png", prompt: "slow dolly in" },
    });
    expect(submitted.externalId).toBe("comfy-prompt-77");
    expect(submitted.status).toBe("queued");

    const polled = await adapter.poll("comfy-prompt-77", "comfyui://wan2.2-i2v", "job-comfy-1");
    expect(polled.status).toBe("completed");
    expect(polled.assets?.[0]?.path).toBe("job-comfy-1/0.mp4");
    expect(fs.existsSync(path.join(tmpDir, "assets", "job-comfy-1", "0.mp4"))).toBe(true);
  });

  it("HuggingFaceProviderAdapter authenticates and saves router output", async () => {
    const mockFetch = vi.fn(async (url: string | URL) => {
      if (String(url).includes("whoami-v2")) {
        return new Response(JSON.stringify({ name: "GHUB31", isPro: false }), { status: 200 });
      }
      return new Response(Buffer.from([137, 80, 78, 71]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    });

    const adapter = new HuggingFaceProviderAdapter({
      fetchImpl: mockFetch as unknown as typeof fetch,
      token: "hf_test_token",
    });

    const health = await adapter.healthCheck();
    expect(health.available).toBe(true);
    expect(health.detail).toContain("GHUB31");

    const res = await adapter.submit({
      jobId: "job-hf-1",
      task: "t2i",
      route: "hf://black-forest-labs/FLUX.1-schnell",
      modelId: "hf/flux-schnell",
      params: { prompt: "matte black headphones" },
    });
    expect(res.status).toBe("completed");
    expect(fs.existsSync(path.join(tmpDir, "assets", "job-hf-1", "0.png"))).toBe(true);
  });

  it("PostizAdapter enforces human approval before dispatching any post", async () => {
    const mockFetch = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith("/api/public/v1/upload")) {
        return new Response(JSON.stringify({ id: "media-1", path: "/uploads/clip.mp4" }), {
          status: 200,
        });
      }
      if (String(url).endsWith("/api/public/v1/posts")) {
        return new Response(JSON.stringify({ id: "postiz-scheduled-99" }), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });

    const postiz = new PostizAdapter({
      fetchImpl: mockFetch as unknown as typeof fetch,
      config: { baseUrl: "http://postiz.local", apiKey: "postiz-secret" },
    });

    const baseRecord: PublishQueueRecord = {
      id: "pub-1",
      campaignId: "camp-1",
      jobId: "job-1",
      platform: "tiktok",
      integrationId: "chan-tiktok-1",
      caption: "Launch drop",
      hashtags: ["vyolab"],
      mediaPaths: [],
      scheduledAt: "2026-12-01T12:00:00.000Z",
      approvalStatus: "pending_approval",
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      postizPostId: null,
      publishStatus: "draft",
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Unapproved post MUST be blocked without calling Postiz
    await expect(postiz.scheduleApprovedPost(baseRecord)).rejects.toThrow(
      PublishingApprovalRequiredError
    );
    expect(mockFetch).not.toHaveBeenCalled();

    // Rejected post MUST also be blocked
    await expect(
      postiz.scheduleApprovedPost({ ...baseRecord, approvalStatus: "rejected" })
    ).rejects.toThrow(PublishingApprovalRequiredError);
    expect(mockFetch).not.toHaveBeenCalled();

    // Approved post dispatches cleanly
    const dispatched = await postiz.scheduleApprovedPost({
      ...baseRecord,
      approvalStatus: "approved",
      approvedBy: "Giles",
      approvedAt: Date.now(),
    });
    expect(dispatched.postizPostId).toBe("postiz-scheduled-99");
    expect(dispatched.status).toBe("scheduled");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
