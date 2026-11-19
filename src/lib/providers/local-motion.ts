import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assetsDir, localMotionEnabled } from "@/lib/env";
import type { AssetRef } from "@/lib/higgsfield/types";
import type {
  CreativeProviderAdapter,
  ProviderHealth,
  ProviderPollResult,
  ProviderSubmitInput,
  ProviderSubmitResult,
} from "./types";

/**
 * Local FFmpeg 2D Camera-Motion & Storyboard Frame Adapter ($0, zero GPU).
 *
 * Clearly labeled as deterministic 2D FFmpeg camera motion (push-in / pan / zoom)
 * rather than neural diffusion — guarantees local end-to-end verification and
 * offline campaign previews when paid APIs or Colab GPUs are offline.
 */

function hasFfmpeg(): boolean {
  try {
    return spawnSync("ffmpeg", ["-version"], { timeout: 5000 }).status === 0;
  } catch {
    return false;
  }
}

async function resolveInputImageToTempFile(imageUrl: string, tmpDir: string): Promise<string> {
  if (imageUrl.startsWith("/api/assets/")) {
    const rel = imageUrl.replace(/^\/api\/assets\//, "");
    const resolved = path.resolve(assetsDir(), rel);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Local asset not found: ${rel}`);
    }
    return resolved;
  }
  if (imageUrl.startsWith("/media/")) {
    const resolved = path.resolve(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Public media file not found: ${imageUrl}`);
    }
    return resolved;
  }
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Could not fetch source image (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = path.join(tmpDir, "source.img");
    fs.writeFileSync(out, buf);
    return out;
  }
  if (fs.existsSync(imageUrl)) {
    return imageUrl;
  }
  throw new Error(`Unsupported image_url for local motion renderer: ${imageUrl}`);
}

function zoompanFilterForPrompt(prompt: string, durationSec: number, fps: number): string {
  const frames = Math.max(24, Math.round(durationSec * fps));
  const lower = prompt.toLowerCase();
  if (lower.includes("pan left") || lower.includes("truck left")) {
    return `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='1.12':x='(iw-iw/zoom)*(1-on/${frames})':y='(ih-ih/zoom)/2':d=${frames}:s=1280x720:fps=${fps}`;
  }
  if (lower.includes("pan right") || lower.includes("truck right")) {
    return `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='1.12':x='(iw-iw/zoom)*(on/${frames})':y='(ih-ih/zoom)/2':d=${frames}:s=1280x720:fps=${fps}`;
  }
  if (lower.includes("pull out") || lower.includes("zoom out")) {
    return `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='max(1.0,1.22-0.22*(on/${frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=${fps}`;
  }
  // Default: smooth cinematic push-in
  return `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(1.22,1.0+0.22*(on/${frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=${fps}`;
}

export class LocalMotionProviderAdapter implements CreativeProviderAdapter {
  readonly id = "local_motion" as const;
  readonly name = "Local FFmpeg Camera Motion (2D Fallback)";
  readonly supportsTasks = ["i2v", "t2i"] as const;

  async healthCheck(): Promise<ProviderHealth> {
    const now = Date.now();
    if (!localMotionEnabled()) {
      return {
        provider: this.id,
        name: this.name,
        configured: false,
        available: false,
        latencyMs: null,
        detail: "Disabled via ENABLE_LOCAL_MOTION_FALLBACK=false.",
        checkedAt: now,
      };
    }
    const ok = hasFfmpeg();
    return {
      provider: this.id,
      name: this.name,
      configured: true,
      available: ok,
      latencyMs: 0,
      detail: ok
        ? "ffmpeg ready ($0 deterministic 2D camera-motion I2V & storyboard plate fallback; not neural diffusion)."
        : "ffmpeg binary not found in PATH.",
      checkedAt: now,
    };
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    if (!hasFfmpeg()) {
      throw new Error("ffmpeg is required for local_motion rendering.");
    }

    const outDir = path.join(assetsDir(), input.jobId);
    fs.mkdirSync(outDir, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-motion-"));

    try {
      if (input.task === "t2i") {
        // Generate a crisp 1280x720 dark-cinema storyboard plate with ffmpeg
        const outPath = path.join(outDir, "0.png");
        const colorHex =
          (typeof input.params.seed === "number" ? input.params.seed : input.jobId.charCodeAt(0)) % 2 === 0
            ? "0x121216"
            : "0x17171d";
        const proc = spawnSync(
          "ffmpeg",
          [
            "-y",
            "-f",
            "lavfi",
            "-i",
            `color=c=${colorHex}:s=1280x720:d=1`,
            "-vf",
            "geq=r='clip(r(X,Y)+18*sin(X/90)*cos(Y/70),0,255)':g='clip(g(X,Y)+22*sin((X+Y)/120),0,255)':b='clip(b(X,Y)+14*cos(X/80),0,255)'",
            "-frames:v",
            "1",
            outPath,
          ],
          { timeout: 30_000 }
        );
        if (proc.status !== 0 || !fs.existsSync(outPath)) {
          throw new Error(`ffmpeg plate render failed: ${proc.stderr?.toString().slice(-300) ?? ""}`);
        }
        const assets: AssetRef[] = [
          {
            path: `${input.jobId}/0.png`,
            type: "image",
            source_url: `local://ffmpeg-plate/${input.jobId}`,
          },
        ];
        return {
          externalId: `local_plate:${input.jobId}`,
          status: "completed",
          assets,
          actualUsd: 0,
        };
      }

      // Image-to-Video (2D cinematic camera push/pan)
      const imageUrl = String(input.params.image_url ?? "");
      if (!imageUrl) {
        throw new Error("Local motion image-to-video requires image_url.");
      }
      const srcPath = await resolveInputImageToTempFile(imageUrl, tmpDir);
      const durationSec = Math.min(8, Math.max(2, Number(input.params.duration ?? 3)));
      const fps = 24;
      const prompt = String(input.params.prompt ?? "slow push in");
      const outPath = path.join(outDir, "0.mp4");

      const filter = zoompanFilterForPrompt(prompt, durationSec, fps);
      const proc = spawnSync(
        "ffmpeg",
        [
          "-y",
          "-loop",
          "1",
          "-i",
          srcPath,
          "-vf",
          filter,
          "-t",
          String(durationSec),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          outPath,
        ],
        { timeout: 60_000 }
      );
      if (proc.status !== 0 || !fs.existsSync(outPath)) {
        throw new Error(`ffmpeg I2V render failed: ${proc.stderr?.toString().slice(-350) ?? ""}`);
      }

      const assets: AssetRef[] = [
        {
          path: `${input.jobId}/0.mp4`,
          type: "video",
          source_url: `local://ffmpeg-i2v/${input.jobId}`,
        },
      ];
      return {
        externalId: `local_i2v:${input.jobId}`,
        status: "completed",
        assets,
        actualUsd: 0,
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async poll(): Promise<ProviderPollResult> {
    return { status: "completed", actualUsd: 0 };
  }
}

export const localMotionAdapter = new LocalMotionProviderAdapter();
