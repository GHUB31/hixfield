"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Check, Send, ShieldCheck, X } from "lucide-react";
import { getJSON, postJSON } from "@/lib/fetcher";
import type { PublishQueueRecord } from "@/lib/higgsfield/types";
import { shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

interface PostizHealth {
  configured: boolean;
  available: boolean;
  baseUrl: string | null;
  detail: string;
  integrationCount: number;
}

interface PostizIntegration {
  id: string;
  name: string;
  identifier: string;
}

export function PublishView() {
  const [items, setItems] = useState<PublishQueueRecord[]>([]);
  const [postiz, setPostiz] = useState<PostizHealth | null>(null);
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([]);
  const [reviewerName, setReviewerName] = useState("Giles");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState("tiktok");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);

  const reviewerId = useId();
  const platId = useId();
  const capId = useId();
  const schedId = useId();

  const loadAll = useCallback(async () => {
    try {
      const [queueRes, intRes] = await Promise.all([
        getJSON<{ items: PublishQueueRecord[]; postiz: PostizHealth }>("/api/publish"),
        getJSON<{ health: PostizHealth; integrations: PostizIntegration[] }>(
          "/api/publish/integrations"
        ),
      ]);
      setItems(queueRes.items);
      setPostiz(queueRes.postiz);
      setIntegrations(intRes.integrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publish queue.");
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await postJSON<{ item: PublishQueueRecord }>("/api/publish", {
        platform,
        caption: caption.trim(),
        hashtags: ["evielabs"],
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setItems((prev) => [res.item, ...prev]);
      setCaption("");
      setFeedback("Draft added to approval queue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft.");
    } finally {
      setCreating(false);
    }
  }

  async function approveItem(id: string, integrationId?: string | null) {
    setBusyId(id);
    setError(null);
    setFeedback(null);
    try {
      const res = await postJSON<{ item: PublishQueueRecord }>(`/api/publish/${id}/approve`, {
        approvedBy: reviewerName.trim() || "EVIE-LABS Reviewer",
        ...(integrationId ? { integrationId } : {}),
      });
      setItems((prev) => prev.map((x) => (x.id === id ? res.item : x)));
      setFeedback(`Approved post ${shortId(id)} for Postiz dispatch.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectItem(id: string) {
    setBusyId(id);
    setError(null);
    setFeedback(null);
    try {
      const res = await postJSON<{ item: PublishQueueRecord }>(`/api/publish/${id}/reject`, {
        reason: "Rejected by reviewer in EVIE-LABS Publish queue",
      });
      setItems((prev) => prev.map((x) => (x.id === id ? res.item : x)));
      setFeedback(`Rejected post ${shortId(id)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function dispatchItem(id: string) {
    setBusyId(id);
    setError(null);
    setFeedback(null);
    try {
      const res = await postJSON<{ item: PublishQueueRecord }>(`/api/publish/${id}/dispatch`, {});
      setItems((prev) => prev.map((x) => (x.id === id ? res.item : x)));
      setFeedback(`Scheduled via Postiz (${res.item.postizPostId}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Postiz dispatch failed.");
      await loadAll();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="animate-rise">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.025em] text-white">
            Publish &amp; Approval
          </h1>
          <p className="mt-1 text-[13px] text-white/55">
            Postiz scheduling protected by a mandatory server-side human approval gate.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/75">
          <span
            className={`size-1.5 rounded-full ${postiz?.available ? "bg-[#d1fe17]" : "bg-amber animate-lamp"}`}
          />
          <span>
            {postiz?.available
              ? `Postiz connected (${postiz.integrationCount} channels)`
              : "Postiz offline / unconfigured"}
          </span>
        </div>
      </header>

      {feedback && (
        <p className="mt-4 text-[12px] font-medium text-[#d1fe17]" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="mt-4 text-[12px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <ShieldCheck className="size-4 text-[#d1fe17]" aria-hidden />
              Approval Guardrail
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
              Unapproved drafts cannot reach Postiz (enforced server-side with HTTP 403).
            </p>
            <div className="mt-4">
              <Field label="Reviewer" htmlFor={reviewerId}>
                <Input
                  id={reviewerId}
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <form
            onSubmit={handleCreateDraft}
            className="flex flex-col gap-3.5 rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-5"
          >
            <h2 className="text-[14px] font-semibold text-white">Queue Manual Draft</h2>
            <Field label="Platform" htmlFor={platId}>
              <Select id={platId} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube Shorts</option>
                <option value="x">X / Twitter</option>
                <option value="linkedin">LinkedIn</option>
              </Select>
            </Field>
            <Field label="Caption" htmlFor={capId}>
              <Textarea
                id={capId}
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write post copy..."
              />
            </Field>
            <Field label="Schedule slot (optional)" htmlFor={schedId}>
              <Input
                id={schedId}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={!caption.trim()} loading={creating}>
              Add to Approval Queue
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-8">
          {items.length === 0 ? (
            <EmptyState
              icon={<Send aria-hidden />}
              title="No posts awaiting review"
              body="Run a Supercomputer campaign or queue a render from Library to review and schedule via Postiz."
            />
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[12px] font-bold text-white uppercase">
                    {item.platform}
                  </span>
                  <span className="font-mono text-[11px] text-white/40">{shortId(item.id)}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      item.approvalStatus === "approved"
                        ? "bg-[#d1fe17]/15 text-[#d1fe17]"
                        : item.approvalStatus === "rejected"
                          ? "bg-danger/15 text-danger"
                          : "bg-amber/15 text-amber"
                    }`}
                  >
                    {item.approvalStatus}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-white/45">
                    {item.publishStatus}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-white/85">
                  {item.caption}
                </p>
                {item.hashtags.length > 0 && (
                  <p className="mt-2 text-[12px] text-white/45">
                    {item.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                  </p>
                )}

                {item.mediaPaths.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.mediaPaths.map((mp) => (
                      <a
                        key={mp}
                        href={`/api/assets/${mp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] text-white/80 hover:bg-white/[0.1]"
                      >
                        {mp}
                      </a>
                    ))}
                  </div>
                )}

                {item.error && <p className="mt-2 text-[12px] text-danger">{item.error}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3.5">
                  {integrations.length > 0 && item.approvalStatus !== "approved" && (
                    <Select
                      aria-label="Postiz Channel"
                      defaultValue={item.integrationId ?? integrations[0]?.id ?? ""}
                      onChange={(e) => {
                        item.integrationId = e.target.value;
                      }}
                      className="max-w-xs"
                    >
                      {integrations.map((int) => (
                        <option key={int.id} value={int.id}>
                          {int.name} ({int.identifier})
                        </option>
                      ))}
                    </Select>
                  )}

                  {item.approvalStatus !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        void approveItem(item.id, item.integrationId ?? integrations[0]?.id ?? null)
                      }
                      loading={busyId === item.id}
                    >
                      <Check className="size-3.5" aria-hidden />
                      Approve
                    </Button>
                  )}

                  {item.approvalStatus !== "rejected" && item.publishStatus === "draft" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void rejectItem(item.id)}
                      loading={busyId === item.id}
                    >
                      <X className="size-3.5" aria-hidden />
                      Reject
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={item.approvalStatus !== "approved" || item.publishStatus === "scheduled"}
                    onClick={() => void dispatchItem(item.id)}
                    loading={busyId === item.id}
                  >
                    <Send className="size-3.5" aria-hidden />
                    Dispatch to Postiz
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
