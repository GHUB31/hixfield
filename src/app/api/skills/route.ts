import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  enhancePromptWithSkills,
  listHiggsfieldSkills,
  matchSkillsForBrief,
} from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const brief = req.nextUrl.searchParams.get("brief");
    const skills = listHiggsfieldSkills();
    const matched = brief ? matchSkillsForBrief(brief) : undefined;
    return NextResponse.json({
      source: "https://github.com/higgsfield-ai/skills",
      count: skills.length,
      skills,
      ...(matched ? { matchedIds: matched.map((s) => s.id) } : {}),
    });
  } catch (err) {
    return apiError(err);
  }
}

const EnhanceBody = z.object({
  prompt: z.string().min(1).max(4000),
  skillIds: z.array(z.string().min(1)).min(1).max(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = EnhanceBody.parse(await req.json());
    const result = enhancePromptWithSkills(body.prompt, body.skillIds);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
