"use client";

import { useEffect, useId, useState } from "react";
import { Wand2 } from "lucide-react";
import { getJSON, postJSON } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

interface SkillSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  sourceRepo: string;
  category: string;
  recommendedModels: string[];
  promptGuidance: string[];
  references: string[];
}

export function SkillsView() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(["higgsfield-generate"]);
  const [rawPrompt, setRawPrompt] = useState(
    "Matte black Vyolab headphone set resting on brushed basalt stone with subtle mist"
  );
  const [enhanced, setEnhanced] = useState<{
    enhancedPrompt: string;
    appliedSkills: string[];
    appliedRules: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const promptId = useId();

  useEffect(() => {
    getJSON<{ skills: SkillSummary[] }>("/api/skills")
      .then((d) => setSkills(d.skills))
      .catch(() => {});
  }, []);

  function toggleSkill(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 5)
    );
  }

  async function handleEnhance() {
    if (!rawPrompt.trim() || selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await postJSON<{
        enhancedPrompt: string;
        appliedSkills: string[];
        appliedRules: string[];
      }>("/api/skills", { prompt: rawPrompt, skillIds: selectedIds });
      setEnhanced(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Higgsfield Agent Skills</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Open-source MIT playbooks synced from{" "}
          <a
            href="https://github.com/higgsfield-ai/skills"
            target="_blank"
            rel="noreferrer"
            className="text-lime-400 underline decoration-lime-400/40 underline-offset-2"
          >
            higgsfield-ai/skills
          </a>{" "}
          ({skills.length} loaded). Select skills to direct prompts or let the Supercomputer Agent
          auto-match them.
        </p>
      </header>

      {/* Live prompt enhancer */}
      <section className="animate-rise rise-1 mt-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink-50">Skill-Guided Prompt Director</h2>
          <span className="font-mono text-xs text-ink-400">
            {selectedIds.length} skill{selectedIds.length === 1 ? "" : "s"} active
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Raw creative prompt" htmlFor={promptId}>
              <Textarea
                id={promptId}
                rows={4}
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
              />
            </Field>
            <Button
              onClick={() => void handleEnhance()}
              disabled={!rawPrompt.trim() || selectedIds.length === 0}
              loading={loading}
            >
              <Wand2 className="size-4" aria-hidden />
              Apply Selected Skills
            </Button>
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <p className="font-mono text-[11px] uppercase text-ink-400">Directed Prompt Output</p>
            {enhanced ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-ink-100">
                  {enhanced.enhancedPrompt}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {enhanced.appliedSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 font-mono text-[11px] text-lime-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-400">
                Select one or more skill cards below and run the director to inspect the enriched
                prompt.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Skill catalog grid */}
      <section className="animate-rise rise-2 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => {
          const active = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              className={`flex flex-col rounded-xl border p-5 text-left transition-colors ${
                active
                  ? "border-lime-400 bg-ink-900 ring-1 ring-lime-400"
                  : "border-ink-700 bg-ink-900 hover:border-ink-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-lime-400">{skill.category}</span>
                <span className="font-mono text-[11px] text-ink-400">v{skill.version}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-ink-50">{skill.id}</h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-300">
                {skill.description}
              </p>
              {skill.recommendedModels.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {skill.recommendedModels.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </section>
    </div>
  );
}
