"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import { useJobPoll } from "@/lib/use-poll";
import type { JobRecord } from "@/lib/higgsfield/types";
import type { ModelDef } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { JobResult } from "./job-result";
import {
  ModelForm,
  buildDefaults,
  buildParams,
  missingRequired,
  type FormValue,
  type FormValues,
} from "./model-form";

export function PlaygroundClient() {
  const [models, setModels] = useState<ModelDef[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);
  const [job, setJob] = useJobPoll(null);

  const loadModels = useCallback(async () => {
    setLoadError(null);
    setModels(null);
    try {
      const data = await getJSON<{ models: ModelDef[] }>("/api/generate/model");
      setModels(data.models);
      const first = data.models[0];
      if (first) {
        setModelId(first.id);
        setValues(buildDefaults(first));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the model catalog.");
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const model = useMemo(
    () => models?.find((m) => m.id === modelId) ?? null,
    [models, modelId]
  );

  const families = useMemo(() => {
    const map = new Map<string, ModelDef[]>();
    for (const m of models ?? []) {
      const list = map.get(m.family);
      if (list) list.push(m);
      else map.set(m.family, [m]);
    }
    return Array.from(map.entries());
  }, [models]);

  const missing = model ? missingRequired(model, values) : [];

  function setField(name: string, value: FormValue) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function switchModel(id: string) {
    const next = models?.find((m) => m.id === id);
    if (!next) return;
    setValues((prev) => {
      const defaults = buildDefaults(next);
      // Small kindness: carry the prompt over when the next model also takes one.
      const takesPrompt = next.fields.some(
        (f) => f.name === "prompt" && (f.type === "textarea" || f.type === "text")
      );
      const prompt = prev["prompt"];
      if (takesPrompt && typeof prompt === "string" && prompt.trim() !== "") {
        defaults["prompt"] = prompt;
      }
      return defaults;
    });
    setModelId(id);
    setSubmitError(null);
    setMissingKeys(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!model || missing.length > 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setMissingKeys(false);
    try {
      const { job: next } = await postJSON<{ job: JobRecord }>("/api/generate/model", {
        model_id: model.id,
        params: buildParams(model, values),
      });
      setJob(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setMissingKeys(true);
      } else {
        setSubmitError(err instanceof Error ? err.message : "The request failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Playground</h1>
      <p className="mt-1 text-sm text-ink-300">Every model route the API exposes, one form.</p>
    </header>
  );

  if (loadError) {
    return (
      <div className="animate-rise">
        {header}
        <div className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
          <p className="text-sm text-danger">{loadError}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadModels()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!models) {
    return (
      <div className="animate-rise">
        {header}
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="h-32 animate-pulse rounded-xl bg-ink-850" />
            <div className="h-96 animate-pulse rounded-xl bg-ink-850" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-ink-850 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (models.length === 0 || !model) {
    return (
      <div className="animate-rise">
        {header}
        <EmptyState
          className="mt-6"
          icon={<FlaskConical />}
          title="The model catalog is empty"
          body="src/data/models.json has no entries. Add a model definition and reload this page."
        />
      </div>
    );
  }

  return (
    <div className="animate-rise">
      {header}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="animate-rise rise-1 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
            <Field label="Model" htmlFor="pg-model">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <Select id="pg-model" value={model.id} onChange={(e) => switchModel(e.target.value)}>
                    {families.map(([family, list]) => (
                      <optgroup key={family} label={family}>
                        {list.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </div>
                {model.verified ? (
                  <span className="self-start whitespace-nowrap rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 font-mono text-[11px] text-lime-400 sm:self-auto">
                    Verified
                  </span>
                ) : (
                  <span className="self-start whitespace-nowrap rounded-full border border-amber/40 px-2.5 py-0.5 font-mono text-[11px] text-amber sm:self-auto">
                    Unverified route
                  </span>
                )}
              </div>
            </Field>
            {!model.verified && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-300">
                This route was seeded from a catalog snapshot and may drift from the live API. Edit
                src/data/models.json to correct it.
              </p>
            )}
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-400">
              Routes come from src/data/models.json, generated from Higgsfield&apos;s official
              OpenAPI spec (docs/higgsfield-openapi.json).
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="animate-rise rise-2 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5"
          >
            <ModelForm key={model.id} model={model} values={values} onChange={setField} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-4">
              <code className="font-mono text-xs text-ink-400">{model.endpoint}</code>
              <Button type="submit" loading={submitting} disabled={missing.length > 0}>
                Generate
              </Button>
            </div>

            {missing.length > 0 && (
              <p className="mt-2 text-right text-[13px] text-ink-400">
                Still needed: {missing.join(", ")}
              </p>
            )}
            {missingKeys && (
              <p className="mt-2 text-right text-[13px] text-amber">
                Add your Higgsfield API key first. Instructions are in the banner above.
              </p>
            )}
            {submitError && (
              <p className="mt-2 text-right text-[13px] text-danger">{submitError}</p>
            )}
          </form>
        </div>

        <section className="animate-rise rise-3 lg:col-span-2">
          {job ? (
            <JobResult job={job} onJob={setJob} />
          ) : (
            <EmptyState
              icon={<FlaskConical />}
              title="No generations yet"
              body="Pick a model, fill in the required fields, then select Generate. The result renders here."
            />
          )}
        </section>
      </div>
    </div>
  );
}
