import type { Metadata } from "next";
import { SkillsView } from "@/components/skills/skills-view";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "Vendored Higgsfield open-source agent skills (higgsfield-ai/skills) with interactive prompt enhancement.",
};

export default function SkillsPage() {
  return <SkillsView />;
}
