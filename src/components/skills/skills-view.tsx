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
    "Matte black EVIE-LABS studio speaker resting on brushed basalt stone with subtle mist"
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.025em] text-white">
            Higgsfield Agent Skills
          </h1>
          <p className="mt-1 text-[13px] text-white/55">
            {skills.length} open-source MIT creative playbooks synced from{" "}
            <a
              href="https://github.com/higgsfield-ai/skills"
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-white/30 underline-offset-2 hover:text-[#d1fe17]"
            >
              higgsfield-ai/skills
            </a>
            .
          </p>
        </div>
      </header>

      {/* Live prompt director */}
      <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0b0b0c] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-white">Skill-Guided Prompt Director</h2>
          <span className="font-mono text-[11px] text-white/45">
            {selectedIds.length} active
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
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-[11px] font-medium text-white/40">Directed Prompt Output</p>
            {enhanced ? (
              <>
                <p className="mt-2 text-[13px] leading-relaxed text-white">
                  {enhanced.enhancedPrompt}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {enhanced.appliedSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-white/45">
                Select one or more skills below and run the director to inspect the enriched prompt.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Skill cards */}
      <section className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => {
          const active = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              className={`flex flex-col rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                active
                  ? "border-[#d1fe17] bg-[#0f0f10] ring-1 ring-[#d1fe17]"
                  : "border-white/[0.08] bg-[#0b0b0c] hover:border-white/[0.18]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-white/75 uppercase">
                  {skill.category}
                </span>
                <span className="font-mono text-[11px] text-white/40">v{skill.version}</span>
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-white">{skill.id}</h3>
              <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-white/55">
                {skill.description}
              </p>
              {skill.recommendedModels.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {skill.recommendedModels.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/55"
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
