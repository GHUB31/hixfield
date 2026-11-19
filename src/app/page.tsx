import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroVideo } from "@/components/landing/hero-video";
import { CopyCommand } from "@/components/landing/copy-command";
import { GitHubStars } from "@/components/landing/github-stars";
import { LoopTile } from "@/components/landing/loop-tile";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "GHUB31/hixfield";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[94svh] flex-col overflow-hidden">
        <HeroVideo />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
          <div className="flex items-baseline gap-2.5">
            <span
              className="text-base font-bold tracking-wide text-ink-50"
              style={{ fontStretch: "125%" }}
            >
              VYOLAB<span className="text-lime-400">.</span>
            </span>
            <span className="font-mono text-[11px] text-ink-400">Hixfield core</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/campaigns"
              className="rounded-lg px-3.5 py-2 text-ink-100 transition-colors hover:bg-ink-800/70 hover:text-ink-50"
            >
              Supercomputer Agent
            </Link>
            <Link
              href="/create/video"
              className="rounded-lg px-3.5 py-2 text-ink-100 transition-colors hover:bg-ink-800/70 hover:text-ink-50"
            >
              Open studio
            </Link>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3.5 py-2 text-ink-100 transition-colors hover:bg-ink-800/70 hover:text-ink-50"
            >
              GitHub
            </a>
          </nav>
        </header>

        <div className="relative z-10 mt-auto max-w-4xl animate-rise px-5 pb-16 sm:px-10 sm:pb-20">
          <h1
            className="text-[clamp(3.5rem,11vw,8.5rem)] font-bold leading-[0.92] tracking-tight text-ink-50"
            style={{ fontStretch: "125%" }}
          >
            VYOLAB
          </h1>
          <p className="rise-1 mt-5 max-w-2xl animate-rise text-lg leading-relaxed text-ink-100 sm:text-xl">
            Self-hosted AI creative platform forked from Hixfield. Camera-controlled video,
            Higgsfield official API &amp; open-source skills, ComfyUI Colab/cloud GPUs, a
            Supercomputer campaign agent, spend caps, and human-approved Postiz scheduling.
          </p>
          <div className="rise-2 mt-8 flex flex-wrap items-center gap-3 animate-rise">
            <CopyCommand
              command={`git clone https://github.com/${REPO}.git`}
              display={`git clone …/${REPO.split("/")[1] ?? "hixfield"}.git`}
            />
            <GitHubStars />
            <Link
              href="/campaigns"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-lime-400 px-5 text-[15px] font-semibold text-ink-950 transition-colors hover:bg-lime-300"
            >
              Launch studio
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="rise-3 mt-6 animate-rise font-mono text-xs tracking-wide text-ink-300">
            server-side keys · GPU/API model router · spend ledger · Postiz approval gate
          </p>
        </div>

        <p className="absolute bottom-4 right-5 z-10 hidden font-mono text-[11px] text-ink-400 sm:block">
          background: Soul still + camera move · Hixfield Night Grading Suite
        </p>
      </section>

      {/* ── The mechanism ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          Pick a camera move. Route to GPU or API. Ship with approval.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
          Every Hixfield studio surface stays intact — DoP camera presets, Soul styles, Characters,
          Speak, Library, and 49 Playground models — now backed by Vyolab&apos;s model router,
          ComfyUI Hugging Face workers, open-source Higgsfield skills, and Postiz publishing review.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LoopTile
            src="/media/hero-loop.mp4"
            poster="/media/hero-soundstage.webp"
            label="DOLLY IN"
            sublabel="soundstage, single lime source"
          />
          <LoopTile
            src="/media/hall-loop.mp4"
            poster="/media/hall-wide.webp"
            label="PUSH IN"
            sublabel="brutalist hall, floor fog"
          />
          <LoopTile
            src="/media/neon-loop.mp4"
            poster="/media/gallery-neon.webp"
            label="PARALLAX"
            sublabel="9:16, handheld drift"
            aspect="aspect-video sm:aspect-auto sm:h-full"
          />
        </div>
      </section>

      {/* ── Platform Architecture ────────────────────────────────────── */}
      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Brief to approved schedule in one self-hosted stack.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                img: "/media/gallery-y2k.webp",
                title: "Supercomputer Agent",
                href: "/campaigns",
                body: "Probes Higgsfield's official Supercomputer Agent API first; falls back seamlessly to Vyolab's multi-stage orchestrator for scripts, storyboards, images, videos, and captions.",
              },
              {
                img: "/media/gallery-neon.webp",
                title: "Model Router & Spend Guardrails",
                href: "/routing",
                body: "Selects between Colab/cloud ComfyUI GPUs, Hugging Face Router, and Higgsfield API by quality, availability, and USD cost with hard daily & monthly caps.",
              },
              {
                img: "/media/lens-macro.webp",
                title: "Higgsfield Open-Source Skills",
                href: "/skills",
                body: "Nine vendored MIT skills from higgsfield-ai/skills power prompt direction, product photoshoots, faceless video hooks, and consistent brandkits.",
              },
              {
                img: "/media/hall-wide.webp",
                title: "Postiz Publishing Approval Gate",
                href: "/publish",
                body: "Every generated social post lands in pending_approval. Nothing reaches Postiz until a human approves the caption, asset, channel, and time slot.",
              },
            ].map(({ img, title, body, href }) => (
              <Link
                key={title}
                href={href}
                className="group relative block min-h-64 overflow-hidden rounded-xl border border-ink-700 transition-colors hover:border-ink-600"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/65 to-ink-950/25"
                  aria-hidden
                />
                <div className="relative flex h-full min-h-64 flex-col justify-end p-5">
                  <h3 className="text-lg font-semibold text-ink-50 group-hover:text-lime-400">
                    {title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-ink-100">{body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Run it (the lime block) ──────────────────────────────────── */}
      <section className="bg-lime-400 text-ink-950">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-24">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
            <div>
              <h2
                className="text-4xl font-bold tracking-tight sm:text-5xl"
                style={{ fontStretch: "115%" }}
              >
                Self-host tonight.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-950/80">
                One Docker Compose stack for Vyolab Studio, optional Postiz scheduling profile, and
                a Colab GPU ComfyUI notebook for zero-API-cost Hugging Face inference.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/create/video"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-ink-950 px-6 text-[15px] font-semibold text-lime-400 transition-colors hover:bg-ink-800"
                >
                  Open Vyolab Studio
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-ink-950 p-6 font-mono text-[13px] leading-loose text-ink-100 shadow-[0_16px_48px_rgba(9,9,11,0.35)]">
              <code>{`cp .env.example .env
docker compose up --build

# with self-hosted Postiz scheduler
docker compose --profile postiz up --build

# run automated test suite
npm test`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 sm:px-10">
          <span
            className="text-sm font-bold tracking-wide text-ink-50"
            style={{ fontStretch: "125%" }}
          >
            VYOLAB<span className="text-lime-400">.</span>
          </span>
          <p className="font-mono text-xs text-ink-400">
            Forked from Mukhsin0508/hixfield (MIT) · Skills from higgsfield-ai/skills (MIT)
          </p>
        </div>
      </footer>
    </div>
  );
}
