# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router) + React + TypeScript for UI and API proxy routes; Node runtime; SQLite (better-sqlite3) for the job library; `@higgsfield/client` as the API transport; ffmpeg for audio conversion; Docker Compose for one-command self-hosting; landing page deploys to Vercel. [Pinned by brief: "react in typescript and nodes in typescript", Vercel landing, docker compose up.]

## Users

Developers and AI-video tinkerers who self-host an open-source clone of Higgsfield's create experience with their own `platform.higgsfield.ai` API key pair. They evaluate it in under two minutes: paste keys, browse the live camera-preset gallery, generate a DoP shot. A second audience reads the landing page/README on GitHub and decides whether to star and clone. [Inferred from brief.]

## Product Purpose

Hixfield is a self-hostable, MIT-licensed web app running entirely on the official Higgsfield API: camera-controlled video (DoP with up to 2 stacked motion presets), Soul-style image generation, Soul ID character consistency, Speak talking avatars, a 37-family model playground, and a persistent local library of every job. Success = the "someone just open-sourced Higgsfield" moment: fresh clone → key pair → one command → live motion-preset gallery within 2 minutes.

## Positioning

The only open-source app that reproduces the Higgsfield product experience (preset-first camera motion gallery with live video thumbnails, stacked motions, start/end frames) on the official API — not an MCP wrapper, not a CLI, a real web app with BYO key.

## Operating Context

- Async job model: submit → request_id/status_url → poll ~2s; statuses queued/in_progress/completed/failed/nsfw/canceled.
- Assets expire upstream in ~7 days → every completed output is downloaded to local disk immediately; the library owns its files.
- No rate-limit headers; concurrency overflow returns HTTP 400 → client-side semaphore (default 2–4) + backoff.
- Auth header `Authorization: Key {id}:{secret}`, server-side only; the key never touches the browser.
- Billing in credits, charged only on `completed`; cost is surfaced honestly per job.
- Motion/style catalogs require auth → fetched server-side, cached per boot, with preview URLs.

## Capabilities and Constraints

In scope (verified API surface): DoP lite/standard/turbo image-to-video with motions[] (max 2, strength 0–1), start/end frames, enhance_prompt, seed; GET /v1/motions (50+ presets); Soul 2 t2i + GET /v1/text2image/soul-styles (80+ styles); Soul ID via /v1/custom-references + soul/character; Speak (image + WAV audio); 37 model families via one submit/poll pattern; uploads via presigned PUT.
Out of scope (not on the public API — never attempt): upscale, VFX library, Cinema Studio optical stack/AI Director, Marketing Studio/UGC Factory, inpainting/Canvas/Layers, background removal, 3D, music.
App must degrade gracefully with no API keys configured (teachable empty states, setup guidance).

## Brand Commitments

Name: Hixfield (may be renamed "Boson" later — name is find/replaceable). No Higgsfield logos or brand assets anywhere in the repo; the look is "recognizably that genre" — dark cinematic UI, lime accent, preset cards with looping video thumbnails — never copied pixels. [Pinned by brief.] README in the viral OSS format: hook line, arrow-bullet features, demo GIF, "100% open source. MIT license." Landing page links the GitHub repo (github.com/Mukhsin0508/hixfield), shows the star count, and carries rich generated media.

## Evidence on Hand

- Official SDK `@higgsfield/client@0.2.1` (verified endpoints: base https://platform.higgsfield.ai, /v1/job-sets/{id} polling, /v1/motions, /v1/text2image/soul-styles, /v1/custom-references).
- Generated Soul/Soul Cinema imagery for landing and UI (in `public/media/`, synthetic, labeled in provenance).
- No customers, benchmarks, testimonials, or pricing exist — never invent any.

## Product Principles

1. Two minutes to wow: every screen teaches its own first run (Add image → Choose preset → Get video).
2. Honest surfaces: real job status, real credit costs, real failures — no fake progress.
3. The library is ours: local files, not hotlinks to expiring URLs.
4. Preset-first creation: browsing beautiful presets IS the interface.
5. One command, two env vars: friction is the enemy of the viral moment.

## Accessibility & Inclusion

Dark UI must hold WCAG AA contrast (lime accent on near-black passes; verify body text ≥ 4.5:1). Full keyboard operability for galleries and forms; motion previews respect prefers-reduced-motion (static poster fallback). [Inferred baseline; no user-specific requirement recorded.]
