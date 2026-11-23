import Link from "next/link";
import { StudioNav } from "@/components/studio-nav";
import { HeroVideo } from "@/components/landing/hero-video";
import { LoopTile } from "@/components/landing/loop-tile";
import { ExploreHeroPrompt } from "@/components/explore/explore-hero-prompt";

const FEATURED_DROPS = [
  {
    href: "/campaigns",
    badge: "NEW",
    title: "SUPERCOMPUTER AGENT",
    subtitle: "Turn one brand brief into scripts, storyboards, videos, captions, and approval-gated posts",
    img: "/media/hall-wide.webp",
  },
  {
    href: "/routing",
    badge: "NEW",
    title: "CLOUD GPU & API ROUTER",
    subtitle: "Route between Colab ComfyUI (Wan 2.2 / FLUX), Hugging Face, and Higgsfield API with spend caps",
    img: "/media/lens-macro.webp",
  },
  {
    href: "/publish",
    badge: null,
    title: "POSTIZ APPROVAL STUDIO",
    subtitle: "Human review gate before scheduling to TikTok, Instagram, YouTube Shorts, and X",
    img: "/media/gallery-neon.webp",
  },
];

const EXPLORE_GALLERY = [
  { src: "/media/gallery-y2k.webp", label: "Y2K Digicam", href: "/create/image" },
  { src: "/media/gallery-luxury.webp", label: "Quiet Luxury", href: "/create/image" },
  { src: "/media/gallery-party.webp", label: "Party Flash", href: "/create/image" },
  { src: "/media/gallery-cctv.webp", label: "CCTV Monochrome", href: "/create/image" },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <StudioNav />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        {/* ── Higgsfield-style Full-Bleed Rounded Cinema Hero Stage ─────────── */}
        <section className="relative flex min-h-[540px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0b0c] px-5 py-14 text-center sm:min-h-[600px] sm:px-10">
          <HeroVideo />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85"
            aria-hidden
          />

          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white uppercase">
              EVIE-LABS STUDIO.
              <br />
              CINEMA-GRADE AI
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-[16px]">
              Camera-controlled video, Soul image aesthetics, open-source Higgsfield skills,
              ComfyUI cloud GPUs, and Supercomputer campaign orchestration in one self-hosted
              workspace.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/create/video"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-7 text-[14px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                Create Your Video
              </Link>
              <Link
                href="/campaigns"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] px-6 text-[14px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/[0.14]"
              >
                Open Supercomputer
              </Link>
            </div>

            <ExploreHeroPrompt />
          </div>
        </section>

        {/* ── Featured Drops (Matches real higgsfield.ai Home 3-card row) ───── */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURED_DROPS.map((item) => (
            <Link key={item.title} href={item.href} className="group block">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0c]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img}
                  alt={item.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {item.badge && (
                  <span className="absolute right-3 top-3 rounded-md bg-[#d1fe17] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-black uppercase">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="mt-2.5 px-0.5">
                <h2 className="text-[13px] font-bold tracking-[0.01em] text-white uppercase group-hover:text-[#d1fe17] transition-colors">
                  {item.title}
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-white/50">{item.subtitle}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* ── Camera Motion Loops Row ───────────────────────────────────────── */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">
              Camera Motion Presets
            </h2>
            <Link
              href="/create/video"
              className="text-[13px] font-medium text-white/55 transition-colors hover:text-white"
            >
              Open Video Studio →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LoopTile
              src="/media/hero-loop.mp4"
              poster="/media/hero-soundstage.webp"
              label="DOLLY IN"
              sublabel="soundstage · motivated key light"
            />
            <LoopTile
              src="/media/hall-loop.mp4"
              poster="/media/hall-wide.webp"
              label="ARCHITECTURAL PUSH"
              sublabel="brutalist hall · floor haze"
            />
            <LoopTile
              src="/media/neon-loop.mp4"
              poster="/media/gallery-neon.webp"
              label="HANDHELD PARALLAX"
              sublabel="9:16 · nocturnal street"
              aspect="aspect-video sm:aspect-auto sm:h-full"
            />
          </div>
        </section>

        {/* ── Explore Aesthetics Grid ───────────────────────────────────────── */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">
              Soul Aesthetics
            </h2>
            <Link
              href="/create/image"
              className="text-[13px] font-medium text-white/55 transition-colors hover:text-white"
            >
              Open Image Studio →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {EXPLORE_GALLERY.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0c]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 pt-12">
                  <span className="text-[13px] font-semibold text-white">{item.label}</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                    Use Style
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
