import fs from "node:fs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataDir } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = db().prepare("SELECT 1 AS ok").get() as { ok: number };
    fs.accessSync(dataDir(), fs.constants.W_OK);
    return NextResponse.json({ ok: row.ok === 1, status: "healthy", timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: "unhealthy", error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }
}
