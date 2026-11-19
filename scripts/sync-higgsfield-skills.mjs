#!/usr/bin/env node
/**
 * Syncs open-source Higgsfield agent skills (MIT) from https://github.com/higgsfield-ai/skills
 * into vendor/higgsfield-skills/ so Vyolab's Skills Studio and Supercomputer Agent can load them offline.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const dest = path.join(root, "vendor", "higgsfield-skills");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vyolab-hf-skills-"));

try {
  execFileSync(
    "git",
    ["clone", "--depth", "1", "https://github.com/higgsfield-ai/skills.git", tmpDir],
    { stdio: "inherit" }
  );

  fs.mkdirSync(dest, { recursive: true });
  for (const meta of ["LICENSE", "VERSION", "README.md"]) {
    const src = path.join(tmpDir, meta);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, meta));
  }

  let count = 0;
  for (const entry of fs.readdirSync(tmpDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("higgsfield-")) continue;
    const skillMd = path.join(tmpDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const targetDir = path.join(dest, entry.name);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(skillMd, path.join(targetDir, "SKILL.md"));

    const refsDir = path.join(tmpDir, entry.name, "references");
    if (fs.existsSync(refsDir)) {
      const targetRefs = path.join(targetDir, "references");
      fs.mkdirSync(targetRefs, { recursive: true });
      for (const ref of ["model-catalog.md", "prompt-engineering.md", "marketing-modes.md", "workflows.md"]) {
        const refPath = path.join(refsDir, ref);
        if (fs.existsSync(refPath)) fs.copyFileSync(refPath, path.join(targetRefs, ref));
      }
    }
    count++;
  }

  console.log(`Synced ${count} Higgsfield skills -> ${path.relative(root, dest)}`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
