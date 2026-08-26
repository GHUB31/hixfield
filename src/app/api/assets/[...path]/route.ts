import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { assetsDir } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

type Params = { params: Promise<{ path: string[] }> };

/** Streams downloaded generation outputs from the local store, with Range support for video scrubbing. */
export async function GET(req: NextRequest, ctx: Params) {
  const { path: segments } = await ctx.params;
  const relative = segments.join("/");
  const root = assetsDir();
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "bad_request", message: "Invalid path." }, { status: 400 });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return NextResponse.json({ error: "not_found", message: "Asset not found." }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), stat.size - 1) : stat.size - 1;
      if (start <= end && start < stat.size) {
        const stream = fs.createReadStream(filePath, { start, end });
        return new NextResponse(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=31536000, immutable",
          },
        });
      }
    }
  }

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
