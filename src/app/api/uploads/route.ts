import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/higgsfield/client";
import { apiError } from "@/lib/api";

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hixfield-audio-"));
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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "image");
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
    const ext = path.extname(file.name).replace(".", "").toLowerCase();

    if (kind === "audio") {
      const isWav = contentType.includes("wav") || ext === "wav";
      if (!isWav) {
        if (!ffmpegAvailable()) {
          return NextResponse.json(
            {
              error: "bad_request",
              message:
                "Speak needs WAV audio. Install ffmpeg so Hixfield can convert automatically, or upload a .wav file.",
            },
            { status: 400 }
          );
        }
        bytes = convertToWav(bytes, ext);
      }
      contentType = "audio/wav";
    } else if (!contentType.startsWith("image/")) {
      // Default lane is images; be explicit rather than uploading mystery bytes.
      return NextResponse.json(
        { error: "bad_request", message: "Only image files are accepted here." },
        { status: 400 }
      );
    }

    const url = await getClient().upload(bytes, contentType);
    return NextResponse.json({ url });
  } catch (err) {
    return apiError(err);
  }
}
