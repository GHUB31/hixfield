import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPublishItem, updatePublishItem } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RejectBody = z.object({
  reason: z.string().min(1).max(500).default("Rejected during publishing review"),
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
    const body = RejectBody.parse(await req.json().catch(() => ({})));
    updatePublishItem(id, {
      approvalStatus: "rejected",
      approvedBy: null,
      approvedAt: null,
      rejectionReason: body.reason,
    });
    return NextResponse.json({ item: getPublishItem(id) });
  } catch (err) {
    return apiError(err);
  }
}
