import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPublishItem, updatePublishItem } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ApproveBody = z.object({
  approvedBy: z.string().min(1).max(120).default("Vyolab Reviewer"),
  caption: z.string().min(1).max(5000).optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string().nullable().optional(),
  integrationId: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = getPublishItem(id);
    if (!item) {
      return NextResponse.json({ error: "not_found", message: "Publish item not found." }, { status: 404 });
    }
    const body = ApproveBody.parse(await req.json().catch(() => ({})));
    updatePublishItem(id, {
      approvalStatus: "approved",
      approvedBy: body.approvedBy,
      approvedAt: Date.now(),
      rejectionReason: null,
      ...(body.caption !== undefined ? { caption: body.caption } : {}),
      ...(body.hashtags !== undefined ? { hashtags: body.hashtags } : {}),
      ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt } : {}),
      ...(body.integrationId !== undefined ? { integrationId: body.integrationId } : {}),
    });
    return NextResponse.json({ item: getPublishItem(id) });
  } catch (err) {
    return apiError(err);
  }
}
