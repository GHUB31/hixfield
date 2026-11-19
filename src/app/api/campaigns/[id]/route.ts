import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getCampaign, listJobRecords, listPublishItems } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const campaign = getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "not_found", message: "Campaign not found." }, { status: 404 });
    }
    const { jobs } = listJobRecords({ campaignId: id, limit: 30 });
    const publishItems = listPublishItems({ campaignId: id, limit: 20 });
    return NextResponse.json({ campaign, jobs, publishItems });
  } catch (err) {
    return apiError(err);
  }
}
