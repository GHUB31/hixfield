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

  // Manual draft composer
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
        hashtags: ["vyolab"],
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setItems((prev) => [res.item, ...prev]);
      setCaption("");
      setFeedback("Draft added to pending_approval queue.");
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
        approvedBy: reviewerName.trim() || "Vyolab Reviewer",
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
        reason: "Rejected by reviewer in Vyolab Publish queue",
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Publish &amp; Approval Queue
          </h1>
          <p className="mt-1.5 text-sm text-ink-300">
            Postiz social scheduling protected by a mandatory server-side human approval gate.
            Nothing dispatches until approved.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs">
          <span
            className={`size-2 rounded-full ${postiz?.available ? "bg-lime-400" : "bg-amber animate-lamp"}`}
          />
          <span className="text-ink-300">
            {postiz?.available
              ? `Postiz connected (${postiz.integrationCount} channels)`
              : "Postiz offline / unconfigured"}
          </span>
        </div>
      </header>

      {postiz && !postiz.available && (
        <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-xs text-ink-300">
          {postiz.detail}
        </div>
      )}

      {feedback && (
        <p className="mt-4 font-mono text-xs text-lime-400" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="mt-4 font-mono text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Reviewer identity + manual draft */}
        <div className="animate-rise rise-1 flex flex-col gap-5 lg:col-span-4">
          <section className="rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-50">
              <ShieldCheck className="size-4 text-lime-400" aria-hidden />
              Approval Guardrail
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
              Every campaign draft enters <code className="font-mono text-amber">pending_approval</code>.
              POST <code className="font-mono text-ink-200">/api/publish/:id/dispatch</code> rejects
              unapproved records with HTTP 403.
            </p>
            <div className="mt-4">
              <Field label="Reviewer name" htmlFor={reviewerId}>
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
            className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5"
          >
            <h2 className="text-sm font-semibold text-ink-50">Queue manual draft</h2>
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
                placeholder="Write post copy to send through approval..."
              />
            </Field>
            <Field label="Scheduled time (optional)" htmlFor={schedId}>
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

        {/* Right: Queue items */}
        <div className="animate-rise rise-2 flex flex-col gap-4 lg:col-span-8">
          {items.length === 0 ? (
            <EmptyState
              icon={<Send aria-hidden />}
              title="No posts awaiting review"
              body="Run a Supercomputer Agent campaign or add a manual draft to review and schedule via Postiz."
            />
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase text-lime-400">{item.platform}</span>
                  <span className="font-mono text-xs text-ink-400">{shortId(item.id)}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
                      item.approvalStatus === "approved"
                        ? "border-lime-400/30 bg-lime-400/10 text-lime-400"
                        : item.approvalStatus === "rejected"
                          ? "border-danger/30 bg-danger/10 text-danger"
                          : "border-amber/30 bg-amber/10 text-amber"
                    }`}
                  >
                    {item.approvalStatus}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-ink-400">
                    publish: {item.publishStatus}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-100">
                  {item.caption}
                </p>
                {item.hashtags.length > 0 && (
                  <p className="mt-2 font-mono text-xs text-ink-400">
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
                        className="rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1 font-mono text-[11px] text-lime-400 hover:border-ink-600"
                      >
                        media: {mp}
                      </a>
                    ))}
                  </div>
                )}

                {item.scheduledAt && (
                  <p className="mt-2 font-mono text-[11px] text-ink-400">
                    slot: {item.scheduledAt}
                  </p>
                )}
                {item.approvedBy && (
                  <p className="mt-1 font-mono text-[11px] text-ink-300">
                    approved by {item.approvedBy}
                  </p>
                )}
                {item.postizPostId && (
                  <p className="mt-1 font-mono text-[11px] text-lime-400">
                    postiz_id: {item.postizPostId}
                  </p>
                )}
                {item.error && <p className="mt-2 font-mono text-xs text-danger">{item.error}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
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
