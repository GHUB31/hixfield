import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroVideo } from "@/components/landing/hero-video";
import { CopyCommand } from "@/components/landing/copy-command";
import { GitHubStars } from "@/components/landing/github-stars";
import { LoopTile } from "@/components/landing/loop-tile";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "Mukhsin0508/hixfield";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[94svh] flex-col overflow-hidden">
        <HeroVideo />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
          <span className="text-base font-bold tracking-wide text-ink-50" style={{ fontStretch: "125%" }}>
            HIXFIELD<span className="text-lime-400">.</span>
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/create/video"
              className="rounded-lg px-3.5 py-2 text-ink-100 transition-colors hover:bg-ink-800/70 hover:text-ink-50"
            >
              Open the studio
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
            HIXFIELD
          </h1>
          <p className="rise-1 mt-5 max-w-2xl animate-rise text-lg leading-relaxed text-ink-100 sm:text-xl">
            The Higgsfield create experience, open-sourced. Camera-controlled video, Soul-style
            images, consistent characters and talking avatars, running on the official API with
            your own key.
          </p>
          <div className="rise-2 mt-8 flex flex-wrap items-center gap-3 animate-rise">
            <CopyCommand command={`git clone https://github.com/${REPO}.git`} display="git clone …/hixfield.git" />
            <GitHubStars />
            <Link
              href="/create/video"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-lime-400 px-5 text-[15px] font-semibold text-ink-950 transition-colors hover:bg-lime-300"
            >
              Try the studio
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="rise-3 mt-6 animate-rise font-mono text-xs tracking-wide text-ink-300">
            MIT license · two env vars · your credits, your files
          </p>
        </div>

        <p className="absolute bottom-4 right-5 z-10 hidden font-mono text-[11px] text-ink-400 sm:block">
          background: one Soul still, one camera move, generated with Higgsfield
        </p>
      </section>

      {/* ── The mechanism ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          Pick a camera move. Stack two. Get the shot.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
          Hixfield pulls Higgsfield&apos;s live motion catalog: more than fifty named camera
          presets, each with a looping preview. Crash Zoom, Dolly Zoom, 360 Orbit, FPV Drone,
          Bullet Time. Choose up to two, set how hard each one hits, add a first frame, and the
          DoP model renders it.
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
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          All three clips are generated stills pushed through image-to-video. Nothing here came
          from a stock library.
        </p>
      </section>

      {/* ── Soul ─────────────────────────────────────────────────────── */}
      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Eighty aesthetics, four frames at a time.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            Soul&apos;s style catalog loads live with previews. Y2K digicams, quiet luxury, CCTV,
            neon noir, party flash. Write one prompt, batch four renders, download the keepers.
          </p>

          <div className="mt-10 columns-2 gap-4 md:columns-3 [&>figure]:mb-4 [&>figure]:break-inside-avoid">
            {[
              { src: "/media/gallery-y2k.webp", label: "Y2K DIGICAM" },
              { src: "/media/gallery-neon.webp", label: "NEON NOIR" },
              { src: "/media/gallery-luxury.webp", label: "QUIET LUXURY" },
              { src: "/media/gallery-party.webp", label: "PARTY FLASH" },
              { src: "/media/gallery-cctv.webp", label: "CCTV" },
            ].map((img) => (
              <figure
                key={img.src}
                className="relative overflow-hidden rounded-xl border border-ink-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={`Soul render in the ${img.label.toLowerCase()} style`} className="w-full" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 to-transparent px-3.5 pb-3 pt-10">
                  <span className="font-mono text-xs tracking-wide text-lime-400">{img.label}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-400">Soul renders, straight from the API.</p>
        </div>
      </section>

      {/* ── The rest of the product ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          The whole create suite, not a demo.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              img: "/media/gallery-y2k.webp",
              title: "Characters",
              body: "Train a Soul ID from a handful of photos, then render the same person in any scene, any style.",
            },
            {
              img: "/media/gallery-neon.webp",
              title: "Speak",
              body: "A portrait plus a voice track becomes a talking avatar. MP3 and friends convert to WAV on the fly.",
            },
            {
              img: "/media/lens-macro.webp",
              title: "Library",
              body: "Every job lands on your disk with its parameters and credit cost. Higgsfield's asset links expire in seven days. Yours don't.",
            },
            {
              img: "/media/hall-wide.webp",
              title: "Playground",
              body: "A schema-driven form for the wider catalog: Kling, Veo, Wan, Sora 2, Seedance, Nano Banana and more.",
            },
          ].map(({ img, title, body }) => (
            <figure
              key={title}
              className="relative min-h-64 overflow-hidden rounded-xl border border-ink-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-ink-950/20"
                aria-hidden
              />
              <figcaption className="relative flex h-full min-h-64 flex-col justify-end p-5">
                <h3 className="text-lg font-semibold text-ink-50">{title}</h3>
                <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-ink-100">{body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">Tile backgrounds are Soul renders too.</p>
        <p className="mt-12 max-w-2xl border-t border-ink-800 pt-6 text-sm leading-relaxed text-ink-300">
          Costs stay visible. Hixfield shows the credit price the API reports on every job, and
          only completed jobs are charged. Failed or flagged renders refund automatically.
        </p>
      </section>

      {/* ── Run it (the lime block) ──────────────────────────────────── */}
      <section className="bg-lime-400 text-ink-950">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-24">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontStretch: "115%" }}>
                Run it tonight.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-950/80">
                Two env vars and one command. Paste a key pair from cloud.higgsfield.ai and the
                motion gallery is on your screen inside two minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`https://github.com/${REPO}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-ink-950 px-6 text-[15px] font-semibold text-lime-400 transition-colors hover:bg-ink-800"
                >
                  Get the source
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
              <p className="mt-6 text-sm text-ink-950/70">
                MIT license. The whole thing, no gated tier.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-ink-950 p-6 font-mono text-[13px] leading-loose text-ink-100 shadow-[0_16px_48px_rgba(9,9,11,0.35)]">
              <code>{`git clone https://github.com/${REPO}.git
cd hixfield
cp .env.example .env   # paste HF_API_KEY_ID + HF_API_KEY_SECRET
docker compose up

# prefer bare metal?
bun install && bun dev`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-ink-800">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink-50">What this is</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                A self-hosted web app for Higgsfield&apos;s official public API
                (platform.higgsfield.ai). You bring the key pair. Your account pays the credits,
                and only for jobs that complete.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-50">What this isn&apos;t</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Affiliated with Higgsfield AI. It also isn&apos;t their private stack: upscale,
                the VFX library, Cinema Studio and inpainting are not on the public API, so you
                won&apos;t find them here.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink-800 pt-6">
            <span className="text-sm font-bold tracking-wide text-ink-50" style={{ fontStretch: "125%" }}>
              HIXFIELD<span className="text-lime-400">.</span>
            </span>
            <p className="font-mono text-xs text-ink-400">
              MIT ·{" "}
              <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" className="text-ink-300 underline decoration-ink-600 underline-offset-2 transition-colors hover:text-lime-400">
                github.com/{REPO}
              </a>{" "}
              · built with the API it wraps
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
