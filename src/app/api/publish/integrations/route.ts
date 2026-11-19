import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { postizAdapter } from "@/lib/providers/postiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await postizAdapter.healthCheck();
    const integrations = health.available ? await postizAdapter.listIntegrations() : [];
    return NextResponse.json({ health, integrations });
  } catch (err) {
    return apiError(err);
  }
}
