"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getJSON, postJSON } from "@/lib/fetcher";
import type {
  BudgetSettings,
  ProviderId,
  RouterStrategy,
  RoutingDecision,
  SpendLedgerEntry,
} from "@/lib/higgsfield/types";
import type { ProviderHealth } from "@/lib/providers/types";
import { shortId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

interface RoutingResponse {
  providers: Record<ProviderId, ProviderHealth>;
  secrets: Record<string, boolean>;
  spend: {
    dailySpentUsd: number;
    monthlySpentUsd: number;
    dailyRemainingUsd: number;
    monthlyRemainingUsd: number;
    settings: BudgetSettings;
    byProvider: Record<string, { usd: number; credits: number; count: number }>;
    recent: SpendLedgerEntry[];
  };
}

export function RoutingView() {
  const [data, setData] = useState<RoutingResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Settings form
  const [dailyCap, setDailyCap] = useState("25");
  const [monthlyCap, setMonthlyCap] = useState("250");
  const [strategy, setStrategy] = useState<RouterStrategy>("balanced");
  const [superMode, setSuperMode] = useState<"auto" | "official" | "local">("auto");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Simulator
  const [simTask, setSimTask] = useState<"i2v" | "t2i" | "t2v" | "character" | "speak">("i2v");
  const [simResult, setSimResult] = useState<RoutingDecision | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const dailyId = useId();
  const monthlyId = useId();
  const stratId = useId();
  const modeId = useId();
  const taskId = useId();

  const loadData = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const res = await getJSON<RoutingResponse>(force ? "/api/routing?refresh=1" : "/api/routing");
      setData(res);
      setDailyCap(String(res.spend.settings.dailyBudgetUsd));
      setMonthlyCap(String(res.spend.settings.monthlyBudgetUsd));
      setStrategy(res.spend.settings.routerStrategy);
      setSuperMode(res.spend.settings.supercomputerMode);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/routing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudgetUsd: Number(dailyCap),
          monthlyBudgetUsd: Number(monthlyCap),
          routerStrategy: strategy,
          supercomputerMode: superMode,
        }),
      });
      if (res.ok) {
        setSavedMsg("Routing policy & spend limits saved.");
        await loadData(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function runSimulation() {
    setSimulating(true);
    setSimError(null);
    try {
      const res = await postJSON<{ decision: RoutingDecision }>("/api/routing", {
        task: simTask,
        strategy,
      });
      setSimResult(res.decision);
    } catch (err) {
      setSimResult(null);
      setSimError(err instanceof Error ? err.message : "No route available.");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="animate-rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Model Router &amp; Spend Guardrails
          </h1>
          <p className="mt-1.5 text-sm text-ink-300">
            Routes across Colab/cloud ComfyUI GPUs, Hugging Face Inference, and Higgsfield API using
            quality, live availability, and cost estimates. API keys remain strictly server-side.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadData(true)}
          loading={refreshing}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Re-probe adapters
        </Button>
      </header>

      {/* Provider health console */}
      <section className="animate-rise rise-1 mt-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="text-sm font-semibold text-ink-50">Provider Adapters</h2>
        <div className="mt-4 divide-y divide-ink-800">
          {Object.values(data?.providers ?? {}).map((p) => (
            <div key={p.provider} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`size-2 rounded-full ${
                  p.available ? "bg-lime-400" : p.configured ? "bg-danger" : "bg-amber animate-lamp"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-50">{p.name}</p>
                <p className="mt-0.5 text-xs text-ink-400">{p.detail}</p>
              </div>
              <span className="font-mono text-xs text-ink-300">
                {p.available ? "AVAILABLE" : p.configured ? "OFFLINE" : "UNCONFIGURED"}
              </span>
              {p.latencyMs != null && (
                <span className="font-mono text-[11px] text-ink-400">{p.latencyMs}ms</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="animate-rise rise-2 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Policy & Budget Caps */}
        <form
          onSubmit={saveSettings}
          className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-5 lg:col-span-5"
        >
          <h2 className="text-sm font-semibold text-ink-50">Routing Policy &amp; Hard Caps</h2>
          <Field label="Default router strategy" htmlFor={stratId}>
            <Select
              id={stratId}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as RouterStrategy)}
            >
              <option value="balanced">Balanced (quality + cost)</option>
              <option value="gpu_first">GPU First (prefer $0 ComfyUI Colab/Cloud GPU)</option>
              <option value="cost">Lowest Cost</option>
              <option value="quality">Highest Quality</option>
              <option value="higgsfield_only">Higgsfield API Only</option>
              <option value="comfyui_only">ComfyUI GPU Only</option>
            </Select>
          </Field>

          <Field label="Supercomputer Agent mode" htmlFor={modeId}>
            <Select
              id={modeId}
              value={superMode}
              onChange={(e) => setSuperMode(e.target.value as "auto" | "official" | "local")}
            >
              <option value="auto">Auto (use official API if authorized, else Vyolab)</option>
              <option value="official">Official Higgsfield Supercomputer API</option>
              <option value="local">Vyolab Self-Hosted Orchestrator</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily cap (USD)" htmlFor={dailyId}>
              <Input
                id={dailyId}
                type="number"
                min={0}
                step="0.5"
                className="font-mono"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
              />
            </Field>
            <Field label="Monthly cap (USD)" htmlFor={monthlyId}>
              <Input
                id={monthlyId}
                type="number"
                min={0}
                step="1"
                className="font-mono"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
              />
            </Field>
          </div>

          <Button type="submit" loading={saving}>
            Save Policy &amp; Caps
          </Button>
          {savedMsg && <p className="font-mono text-xs text-lime-400">{savedMsg}</p>}
        </form>

        {/* Live Route Simulator */}
        <section className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold text-ink-50">Live Route Decision Simulator</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1">
              <Field label="Task" htmlFor={taskId}>
                <Select
                  id={taskId}
                  value={simTask}
                  onChange={(e) =>
                    setSimTask(e.target.value as "i2v" | "t2i" | "t2v" | "character" | "speak")
                  }
                >
                  <option value="i2v">Image-to-Video (i2v)</option>
                  <option value="t2i">Text-to-Image (t2i)</option>
                  <option value="t2v">Text-to-Video (t2v)</option>
                  <option value="character">Character Consistency</option>
                  <option value="speak">Talking Avatar (Speak)</option>
                </Select>
              </Field>
            </div>
            <Button onClick={() => void runSimulation()} loading={simulating}>
              Evaluate Route
            </Button>
          </div>

          {simError && <p className="font-mono text-xs text-danger">{simError}</p>}

          {simResult && (
            <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <p className="font-mono text-xs text-lime-400">
                WINNER: {simResult.selectedModelId} ({simResult.selectedProvider}) · est. $
                {simResult.estimatedCostUsd.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-ink-300">{simResult.reason}</p>
              <div className="mt-3 divide-y divide-ink-800 font-mono text-[11px]">
                {simResult.candidates.map((c) => (
                  <div key={c.modelId} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span className={c.available ? "text-ink-100" : "text-ink-400 line-through"}>
                      {c.label}
                    </span>
                    <span className="text-ink-400">
                      q:{c.qualityScore} · ${c.estimatedCostUsd.toFixed(2)} · score:
                      {c.compositeScore}
                      {c.reason ? ` (${c.reason})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Spend Ledger */}
      <section className="animate-rise rise-3 mt-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink-50">Spend Ledger</h2>
          {data?.spend && (
            <span className="font-mono text-xs text-ink-300">
              Today: ${data.spend.dailySpentUsd.toFixed(2)} / $
              {data.spend.settings.dailyBudgetUsd.toFixed(2)} · Month: $
              {data.spend.monthlySpentUsd.toFixed(2)} / $
              {data.spend.settings.monthlyBudgetUsd.toFixed(2)}
            </span>
          )}
        </div>
        {data?.spend.recent.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-ink-800 text-ink-400">
                <tr>
                  <th className="pb-2 pr-4 font-normal">Job</th>
                  <th className="pb-2 pr-4 font-normal">Provider</th>
                  <th className="pb-2 pr-4 font-normal">Model</th>
                  <th className="pb-2 pr-4 font-normal">Est. USD</th>
                  <th className="pb-2 pr-4 font-normal">Actual USD</th>
                  <th className="pb-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/70 text-ink-200">
                {data.spend.recent.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4 text-ink-400">{shortId(row.jobId)}</td>
                    <td className="py-2 pr-4">{row.provider}</td>
                    <td className="py-2 pr-4 text-ink-300">{row.modelId}</td>
                    <td className="py-2 pr-4">${row.estimatedUsd.toFixed(3)}</td>
                    <td className="py-2 pr-4">
                      {row.actualUsd != null ? `$${row.actualUsd.toFixed(3)}` : "—"}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          row.status === "settled"
                            ? "text-lime-400"
                            : row.status === "refunded"
                              ? "text-ink-400"
                              : "text-amber"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-400">No generation spend entries recorded yet.</p>
        )}
      </section>
    </div>
  );
}
