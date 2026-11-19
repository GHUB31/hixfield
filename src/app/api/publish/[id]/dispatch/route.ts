import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getPublishItem, updatePublishItem } from "@/lib/db";
import { assertPublishApproved, postizAdapter } from "@/lib/providers/postiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = getPublishItem(id);
    if (!item) {
      return NextResponse.json({ error: "not_found", message: "Publish item not found." }, { status: 404 });
    }

    // Hard server-side approval gate: throws 403 PublishingApprovalRequiredError unless approved
    assertPublishApproved(item);

    try {
      const result = await postizAdapter.scheduleApprovedPost(item);
      updatePublishItem(id, {
        postizPostId: result.postizPostId,
        publishStatus: result.status,
        error: null,
      });
      return NextResponse.json({ item: getPublishItem(id), dispatch: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updatePublishItem(id, { publishStatus: "failed", error: msg });
      throw err;
    }
  } catch (err) {
    return apiError(err);
  }
}
