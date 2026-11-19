import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSoulStylesWithSource } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const { styles, source } = await getSoulStylesWithSource(force);
    return NextResponse.json({ styles, source });
  } catch (err) {
    return apiError(err);
  }
}
