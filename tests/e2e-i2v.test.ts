import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getJob } from "@/lib/db";
import { createRoutedJob } from "@/lib/jobs";
import { invalidateProviderHealthCache } from "@/lib/providers/registry";
import { getSpendSummary } from "@/lib/spend";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-test-e2e-i2v-"));
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

describe("End-to-End Image-to-Video Generation", () => {
  it("completes a full I2V generation from a real source image into a valid MP4 on disk", async () => {
    const { job, decision } = await createRoutedJob({
      kind: "dop",
      task: "i2v",
      preferredProvider: "local_motion",
      params: {
        image_url: "/media/hero-soundstage.webp",
        prompt: "Slow dramatic push in on soundstage, shallow focus",
        duration: 2,
      },
    });

    expect(decision.selectedProvider).toBe("local_motion");
    expect(job.status).toBe("completed");
    expect(job.assets.length).toBe(1);
    expect(job.assets[0].type).toBe("video");

    const mp4Path = path.join(tmpDir, "assets", job.assets[0].path);
    expect(fs.existsSync(mp4Path)).toBe(true);
    const stat = fs.statSync(mp4Path);
    expect(stat.size).toBeGreaterThan(10_000);

    // Verify valid H.264 video stream with ffprobe
    const probe = spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,width,height",
        "-of",
        "csv=p=0",
        mp4Path,
      ],
      { encoding: "utf8" }
    );
    expect(probe.status).toBe(0);
    expect(probe.stdout.trim()).toContain("h264");

    // Verify persistence in SQLite jobs & spend_ledger
    const persisted = getJob(job.id);
    expect(persisted?.status).toBe("completed");
    expect(persisted?.provider).toBe("local_motion");

    const spend = getSpendSummary();
    expect(spend.recent.some((e) => e.jobId === job.id && e.status === "settled")).toBe(true);
  });
});
