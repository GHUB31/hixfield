# EVIE-LABS

Self-hosted AI creative platform for **EVIE-LABS**, forked from [`Mukhsin0508/hixfield`](https://github.com/Mukhsin0508/hixfield) (MIT).

Preserves Hixfield's **Night Grading Suite** UI (`DESIGN.md`) and all six original studio workflows while adding a multi-provider model router, Higgsfield open-source agent skills, ComfyUI Colab/cloud GPU workers for Hugging Face models, a Supercomputer-style campaign agent, spend guardrails, and approval-gated Postiz social scheduling.

## Architecture

- **Preserved Hixfield Studio**: Video (DoP camera presets), Image (Soul styles), Characters (Soul ID), Speak (talking avatars with automatic WAV conversion), Library (local SQLite + owned assets), and 49 OpenAPI-verified Playground models (`src/data/models.json`).
- **Separate Provider Adapters (`src/lib/providers/`)**:
  - `higgsfield.ts` — Official Higgsfield Platform API (`platform.higgsfield.ai` v1 + v2 + catalogs + concurrency queue).
  - `higgsfield-agent.ts` — Official Higgsfield Supercomputer Agent API (`api.higgsfield.ai/v1/agent/sessions`, `/messages`, `/interrupt`). Automatically probes entitlement; falls back to Vyolab's orchestrator on `403` (`AgentAccessDeniedError`) or missing keys.
  - `comfyui.ts` — ComfyUI REST adapter (`/system_stats`, `/upload/image`, `/prompt`, `/history`, `/view`) with parameterized **Wan 2.2 TI2V** and **FLUX.1-schnell** workflows for Hugging Face weights on Colab/cloud GPUs.
  - `huggingface.ts` — Hugging Face Inference Router adapter (`router.huggingface.co`).
  - `local-motion.ts` — Deterministic `$0` FFmpeg 2D camera-motion fallback (clearly labeled as 2D motion, not neural diffusion).
  - `postiz.ts` — Postiz Public API (`/api/public/v1/*`) with a **hard server-side approval gate** (`PublishingApprovalRequiredError` HTTP 403 for any unapproved or rejected draft).
  - `llm.ts` — Server-side LLM planner (OpenAI-compatible, Gemini, or Hugging Face Router, with deterministic skills-guided fallback).
- **Higgsfield Open-Source Agent Skills (`vendor/higgsfield-skills/`)**: All 9 MIT-licensed skills synced from [`higgsfield-ai/skills`](https://github.com/higgsfield-ai/skills) (`npm run skills:sync`).
- **Model Router & Spend Guardrails (`src/lib/router/`, `src/lib/spend.ts`)**: Scores candidates by availability, quality (0–100), and estimated USD cost across strategies (`balanced`, `gpu_first`, `cost`, `quality`, `higgsfield_only`, `comfyui_only`), enforcing daily and monthly USD caps in SQLite `spend_ledger`.
- **Supercomputer Agent (`/campaigns`)**: Turns a brand brief into scripts, continuity bibles, storyboards, routed keyframe images, image-to-video clips, platform captions, and `pending_approval` social drafts.

## Quick Start (Docker)

```bash
cp .env.example .env
# Add server-side keys (HF_API_KEY_ID / HF_API_KEY_SECRET, COMFYUI_BASE_URL, POSTIZ_API_KEY, etc.)

docker compose up --build

# Optional: include self-hosted Postiz (Postgres + Redis + Postiz on :4007)
docker compose --profile postiz up --build
```

## Connecting a Colab GPU ComfyUI Worker (Hugging Face Models)

1. Open [`colab/vyolab_comfyui_worker.ipynb`](./colab/vyolab_comfyui_worker.ipynb) on a Google Colab GPU runtime (T4 / L4 / A100).
2. Run all cells to pull open-source Hugging Face weights (`Wan 2.2 TI2V 5B`, `FLUX.1-schnell`) and launch ComfyUI behind a tunnel.
3. Paste the printed URL into `COMFYUI_BASE_URL` in `.env` and restart Vyolab Studio.

## Local Development & Tests

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Security & Operational Guardrails

- All API keys (`HF_API_KEY_ID`, `HF_API_KEY_SECRET`, `COMFYUI_AUTH_TOKEN`, `HUGGINGFACE_TOKEN`, `LLM_API_KEY`, `POSTIZ_API_KEY`) stay strictly server-side and are never serialized to the browser.
- Every generated social post enters `pending_approval` and cannot be dispatched to Postiz until explicitly approved by a human reviewer.
- Failed, NSFW, or canceled jobs automatically refund reserved spend in `spend_ledger`.
