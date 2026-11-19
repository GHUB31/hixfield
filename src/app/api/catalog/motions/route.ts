import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getMotionsWithSource } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const { motions, source } = await getMotionsWithSource(force);
    return NextResponse.json({ motions, source });
  } catch (err) {
    return apiError(err);
  }
}
