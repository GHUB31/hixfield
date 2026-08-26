import { NextRequest, NextResponse } from "next/server";
import { getSoulStyles } from "@/lib/catalog";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const styles = await getSoulStyles(force);
    return NextResponse.json({ styles });
  } catch (err) {
    return apiError(err);
  }
}
