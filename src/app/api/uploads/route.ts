import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assetsDir, hasKeys } from "@/lib/env";
import { getClient } from "@/lib/higgsfield/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 40 * 1024 * 1024;

function ffmpegAvailable(): boolean {
  try {
    return spawnSync("ffmpeg", ["-version"], { timeout: 5000 }).status === 0;
  } catch {
    return false;
  }
}

/** Speak accepts WAV only, so anything else is converted server-side. */
function convertToWav(input: Buffer, ext: string): Buffer {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-audio-"));
  try {
    const inPath = path.join(dir, `in.${ext || "bin"}`);
    const outPath = path.join(dir, "out.wav");
    fs.writeFileSync(inPath, input);
    const proc = spawnSync(
      "ffmpeg",
      ["-y", "-i", inPath, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", outPath],
      { timeout: 90_000 }
    );
    if (proc.status !== 0 || !fs.existsSync(outPath)) {
      const stderr = proc.stderr?.toString().slice(-400) ?? "";
      throw new Error(`Audio conversion failed. ffmpeg said: ${stderr}`);
    }
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function saveLocalUpload(bytes: Buffer, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const dir = path.join(assetsDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${safeExt}`;
  fs.writeFileSync(path.join(dir, filename), bytes);
  return `/api/assets/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "image");
    const target = String(form.get("target") ?? "auto");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "bad_request", message: "Attach a file under the `file` field." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "bad_request", message: "That file is over the 40 MB upload limit." },
        { status: 400 }
      );
    }

    let bytes: Buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type || "application/octet-stream";
    let ext = path.extname(file.name).replace(".", "").toLowerCase();

    if (kind === "audio") {
      const isWav = contentType.includes("wav") || ext === "wav";
      if (!isWav) {
        if (!ffmpegAvailable()) {
          return NextResponse.json(
            {
              error: "bad_request",
              message:
                "Speak needs WAV audio. Install ffmpeg so Vyolab can convert automatically, or upload a .wav file.",
            },
            { status: 400 }
          );
        }
        bytes = convertToWav(bytes, ext);
      }
      contentType = "audio/wav";
      ext = "wav";
    } else if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "bad_request", message: "Only image files are accepted here." },
        { status: 400 }
      );
    }

    // Use Higgsfield presigned upload when keys exist (unless local storage explicitly requested),
    // otherwise persist locally under DATA_DIR/assets/uploads for ComfyUI / HF / Local Motion.
    if (target !== "local" && hasKeys()) {
      const url = await getClient().upload(bytes, contentType);
      return NextResponse.json({ url, storage: "higgsfield" });
    }

    const fallbackExt =
      ext ||
      (contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("jpeg") || contentType.includes("jpg")
            ? "jpg"
            : "bin");
    const url = saveLocalUpload(bytes, fallbackExt);
    return NextResponse.json({ url, storage: "local" });
  } catch (err) {
    return apiError(err);
  }
}
