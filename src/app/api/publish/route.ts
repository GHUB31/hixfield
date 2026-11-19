import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { insertPublishItem, listPublishItems } from "@/lib/db";
import type { ApprovalStatus, PublishQueueRecord } from "@/lib/higgsfield/types";
import { postizAdapter } from "@/lib/providers/postiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const statusParam = req.nextUrl.searchParams.get("approvalStatus") as ApprovalStatus | null;
    const items = listPublishItems({
      ...(statusParam ? { approvalStatus: statusParam } : {}),
      limit: 60,
    });
    const postiz = await postizAdapter.healthCheck();
    return NextResponse.json({ items, postiz });
  } catch (err) {
    return apiError(err);
  }
}

const CreatePublishBody = z.object({
  campaignId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  platform: z.string().min(1).max(40),
  integrationId: z.string().nullable().optional(),
  caption: z.string().min(1).max(5000),
  hashtags: z.array(z.string().min(1).max(64)).max(30).default([]),
  mediaPaths: z.array(z.string().min(1)).max(10).default([]),
  scheduledAt: z.string().nullable().optional(),
});

/**
 * Every newly queued social post enters `pending_approval`.
 * Automated agents and client requests cannot bypass human approval.
 */
export async function POST(req: NextRequest) {
  try {
    const body = CreatePublishBody.parse(await req.json());
    const now = Date.now();
    const record: PublishQueueRecord = {
      id: crypto.randomUUID(),
      campaignId: body.campaignId ?? null,
      jobId: body.jobId ?? null,
      platform: body.platform,
      integrationId: body.integrationId ?? null,
      caption: body.caption,
      hashtags: body.hashtags,
      mediaPaths: body.mediaPaths,
      scheduledAt: body.scheduledAt ?? null,
      approvalStatus: "pending_approval",
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      postizPostId: null,
      publishStatus: "draft",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    insertPublishItem(record);
    return NextResponse.json({ item: record }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
