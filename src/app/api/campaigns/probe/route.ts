import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { supercomputerAgentAdapter } from "@/lib/providers/higgsfield-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const probe = await supercomputerAgentAdapter.probeAccess();
    return NextResponse.json({ probe });
  } catch (err) {
    return apiError(err);
  }
}
