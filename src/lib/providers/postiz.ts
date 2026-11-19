import fs from "node:fs";
import path from "node:path";
import { assetsDir, postizConfig, type PostizConfig } from "@/lib/env";
import type { PublishQueueRecord } from "@/lib/higgsfield/types";

/**
 * Postiz Social Media Scheduling Adapter.
 * Uses Postiz Public API (/api/public/v1/*) with server-side POSTIZ_API_KEY.
 *
 * HARD GUARDRAIL:
 * No post may EVER be dispatched to Postiz unless `record.approvalStatus === "approved"`
 * and `record.approvedBy` is recorded. Drafts created by the Supercomputer Agent always
 * enter `pending_approval` first.
 */

export class PublishingApprovalRequiredError extends Error {
  readonly statusCode = 403;
  constructor(postId: string, currentStatus: string) {
    super(
      `Publishing approval required: post ${postId} has approvalStatus="${currentStatus}". A human reviewer must approve before dispatching to Postiz.`
    );
    this.name = "PublishingApprovalRequiredError";
  }
}

export interface PostizIntegration {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled?: boolean;
}

export interface PostizHealth {
  configured: boolean;
  available: boolean;
  baseUrl: string | null;
  detail: string;
  integrationCount: number;
  checkedAt: number;
}

export interface PostizDispatchResult {
  postizPostId: string;
  status: "scheduled" | "published";
  raw: unknown;
}

export function assertPublishApproved(record: PublishQueueRecord): void {
  if (record.approvalStatus !== "approved" || !record.approvedBy) {
    throw new PublishingApprovalRequiredError(record.id, record.approvalStatus);
  }
}

export class PostizAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly configOverride?: PostizConfig | null;

  constructor(opts?: { fetchImpl?: typeof fetch; config?: PostizConfig | null }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.configOverride = opts?.config;
  }

  private getConfig(): PostizConfig | null {
    if (this.configOverride !== undefined) return this.configOverride;
    return postizConfig();
  }

  private headers(cfg: PostizConfig, json = true): Record<string, string> {
    return {
      Authorization: cfg.apiKey,
      Accept: "application/json",
      ...(json ? { "Content-Type": "application/json" } : {}),
    };
  }

  async healthCheck(): Promise<PostizHealth> {
    const now = Date.now();
    const cfg = this.getConfig();
    if (!cfg) {
      return {
        configured: false,
        available: false,
        baseUrl: null,
        detail: "Set POSTIZ_BASE_URL and POSTIZ_API_KEY server-side (or start docker compose --profile postiz).",
        integrationCount: 0,
        checkedAt: now,
      };
    }

    try {
      const integrations = await this.listIntegrations();
      return {
        configured: true,
        available: true,
        baseUrl: cfg.baseUrl,
        detail: `Connected to Postiz (${integrations.length} channel${integrations.length === 1 ? "" : "s"}).`,
        integrationCount: integrations.length,
        checkedAt: Date.now(),
      };
    } catch (err) {
      return {
        configured: true,
        available: false,
        baseUrl: cfg.baseUrl,
        detail: `Postiz unreachable at ${cfg.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        integrationCount: 0,
        checkedAt: Date.now(),
      };
    }
  }

  async listIntegrations(): Promise<PostizIntegration[]> {
    const cfg = this.getConfig();
    if (!cfg) return [];
    const res = await this.fetchImpl(`${cfg.baseUrl}/api/public/v1/integrations`, {
      headers: this.headers(cfg, false),
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) {
      throw new Error(`Postiz /integrations returned HTTP ${res.status}`);
    }
    const data = (await res.json()) as PostizIntegration[] | { integrations?: PostizIntegration[] };
    return Array.isArray(data) ? data : (data.integrations ?? []);
  }

  async uploadMedia(assetRelativePath: string): Promise<{ id: string; path: string }> {
    const cfg = this.getConfig();
    if (!cfg) throw new Error("Postiz is not configured.");
    const fullPath = path.resolve(assetsDir(), assetRelativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Asset file not found for Postiz upload: ${assetRelativePath}`);
    }
    const bytes = fs.readFileSync(fullPath);
    const filename = path.basename(fullPath);
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
    const res = await this.fetchImpl(`${cfg.baseUrl}/api/public/v1/upload`, {
      method: "POST",
      headers: this.headers(cfg, false),
      body: form,
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Postiz /upload failed (HTTP ${res.status}): ${text}`);
    }
    return (await res.json()) as { id: string; path: string };
  }

  /**
   * Dispatches an ALREADY-APPROVED publish queue record to Postiz.
   * Throws PublishingApprovalRequiredError if the record is not approved.
   */
  async scheduleApprovedPost(record: PublishQueueRecord): Promise<PostizDispatchResult> {
    assertPublishApproved(record);

    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        "Postiz is not configured. Set POSTIZ_BASE_URL and POSTIZ_API_KEY server-side to dispatch approved posts."
      );
    }
    if (!record.integrationId) {
      throw new Error("Select a Postiz social integration/channel before scheduling.");
    }

    const uploadedMedia: Array<{ id: string; path: string }> = [];
    for (const rel of record.mediaPaths) {
      uploadedMedia.push(await this.uploadMedia(rel));
    }

    const fullCaption =
      record.hashtags.length > 0
        ? `${record.caption}\n\n${record.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
        : record.caption;

    const scheduleType = record.scheduledAt ? "schedule" : "now";
    const payload = {
      type: scheduleType,
      date: record.scheduledAt ?? new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: record.integrationId },
          value: [
            {
              content: fullCaption,
              image: uploadedMedia.map((m) => ({ id: m.id, path: m.path })),
            },
          ],
          settings: {
            __type: record.platform.toLowerCase(),
          },
        },
      ],
    };

    const res = await this.fetchImpl(`${cfg.baseUrl}/api/public/v1/posts`, {
      method: "POST",
      headers: this.headers(cfg, true),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 400);
      throw new Error(`Postiz /posts failed (HTTP ${res.status}): ${text}`);
    }

    const data = (await res.json()) as { id?: string; postId?: string } | Array<{ postId?: string; id?: string }>;
    const first = Array.isArray(data) ? data[0] : data;
    const postizPostId = first?.postId ?? first?.id ?? `postiz-${Date.now()}`;
    return {
      postizPostId,
      status: scheduleType === "schedule" ? "scheduled" : "published",
      raw: data,
    };
  }
}

export const postizAdapter = new PostizAdapter();
