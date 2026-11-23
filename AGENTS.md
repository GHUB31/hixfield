# EVIE-LABS — Repository Agent Instructions

## Ownership & Architecture

- **Upstream fork**: Forked from `Mukhsin0508/hixfield` (MIT) to `GHUB31/hixfield`.
- **Design Authority**: Preserve [`DESIGN.md`](./DESIGN.md) ("The Night Grading Suite") — single dark theme (`#09090b` to `#17171d`), 1px `#26262e` hairlines, `#ccff00` Signal Lime strictly for state/selection/CTA, Archivo width-axis wordmark, Spline Sans Mono strictly for tabular data. Do not add light mode or generic SaaS stat cards.
- **Provider Separation**: Keep every external provider isolated in its own adapter under `src/lib/providers/` (`higgsfield.ts`, `higgsfield-agent.ts`, `comfyui.ts`, `huggingface.ts`, `local-motion.ts`, `postiz.ts`, `llm.ts`).
- **Server-Side Keys Only**: Read credentials only in `src/lib/env.ts` on the server; never serialize keys into client bundles, API responses, or git commits.
- **Spend & Publishing Guardrails**:
  - Every paid call must pass `assertBudgetAllowance()` (`src/lib/spend.ts`) before dispatch and settle/refund in SQLite `spend_ledger`.
  - Every social post enters `pending_approval` and cannot be dispatched to Postiz until explicitly approved (`assertPublishApproved()` in `src/lib/providers/postiz.ts`).

## Verification Gates

Run before claiming completion or pushing checkpoints:

```bash
npm run typecheck
npm test
npm run build
```

For Docker verification:

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:3000/api/health
```

## Storage & Cloud Execution Hygiene

- Keep `/data/` (SQLite database and downloaded media assets) out of git.
- Prefer cloud/Colab GPU workers (`colab/vyolab_comfyui_worker.ipynb`) over downloading multi-gigabyte diffusion weights onto local disk.
- Check local disk headroom before pulling container images or rendering large media batches.
