import { NextRequest, NextResponse } from "next/server";
import { getMotions } from "@/lib/catalog";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const motions = await getMotions(force);
    return NextResponse.json({ motions });
  } catch (err) {
    return apiError(err);
  }
}
