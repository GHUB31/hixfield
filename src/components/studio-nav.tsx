"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Cpu,
  FolderOpen,
  Image as ImageIcon,
  Send,
  Sparkles,
} from "lucide-react";
import { getJSON } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Explore", exact: true },
  { href: "/create/image", label: "Image" },
  { href: "/create/video", label: "Video" },
  { href: "/campaigns", label: "Agentic" },
  { href: "/characters", label: "Characters" },
  { href: "/speak", label: "Speak" },
  { href: "/playground", label: "Models" },
  { href: "/library", label: "Library" },
  { href: "/publish", label: "Publish" },
];

const MOBILE_ITEMS = [
  { href: "/create/video", label: "Video", icon: Clapperboard },
  { href: "/create/image", label: "Image", icon: ImageIcon },
  { href: "/campaigns", label: "Agentic", icon: Sparkles },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/publish", label: "Publish", icon: Send },
  { href: "/routing", label: "Router", icon: Cpu },
];

interface StatusSnapshot {
  hasKeys: boolean;
  skillsCount?: number;
  providers?: Record<string, { available: boolean }>;
  spend?: { dailySpentUsd: number; dailyBudgetUsd: number };
}

export function EvieLabsMark() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-black">
      <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
        <path d="M4 4h12v2.6H6.8v2.1h7.6v2.5H6.8v2.2H16V16H4V4Z" />
      </svg>
    </span>
  );
}

export function StudioNav() {
  const pathname = usePathname();
  const [status, setStatus] = useState<StatusSnapshot | null>(null);

  useEffect(() => {
    getJSON<StatusSnapshot>("/api/status")
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  const hasCloudOrGpu =
    Boolean(status?.providers?.higgsfield?.available) ||
    Boolean(status?.providers?.comfyui?.available) ||
    Boolean(status?.providers?.huggingface?.available);

  return (
    <>
      {/* Authentic Higgsfield-style flat obsidian top bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Monogram + EVIE-LABS + Higgsfield-style Skills drop pill */}
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <EvieLabsMark />
              <span className="text-[14px] font-extrabold tracking-[-0.02em] text-white">
                EVIE-LABS
              </span>
            </Link>

            <Link
              href="/skills"
              className="hidden items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.1] xl:inline-flex"
            >
              <span>Skills</span>
              <span className="rounded bg-[#d1fe17]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#d1fe17]">
                {status?.skillsCount ?? 9} New
              </span>
            </Link>
          </div>

          {/* Center: Clean unboxed Inter text nav (no icons, no pill clutter) */}
          <nav
            aria-label="EVIE-LABS Studio"
            className="hidden items-center gap-6 overflow-x-auto lg:flex"
          >
            {NAV_LINKS.map(({ href, label, exact }) => {
              const active = exact ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap text-[13px] font-medium transition-colors",
                    active ? "text-white" : "text-white/55 hover:text-white"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Router/Spend compact chip + Acid Lime CTA */}
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/routing"
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition-colors",
                pathname.startsWith("/routing")
                  ? "border-white/25 bg-white/[0.12] text-white"
                  : "border-white/[0.08] bg-white/[0.05] text-white/75 hover:bg-white/[0.09] hover:text-white"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  hasCloudOrGpu ? "bg-[#d1fe17]" : "bg-amber animate-lamp"
                )}
                aria-hidden
              />
              <span>{hasCloudOrGpu ? "GPU / API" : "Router"}</span>
              {status?.spend && (
                <span className="hidden font-mono text-[11px] text-white/45 sm:inline">
                  ${status.spend.dailySpentUsd.toFixed(2)}/${status.spend.dailyBudgetUsd.toFixed(0)}
                </span>
              )}
            </Link>

            <Link
              href="/campaigns"
              className="inline-flex h-8 items-center rounded-lg bg-[#d1fe17] px-3.5 text-[12px] font-bold text-black transition-colors hover:bg-[#dcff4a]"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom bar */}
      <nav
        aria-label="EVIE-LABS Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-black/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-6">
          {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-[#d1fe17]" : "text-white/50 hover:text-white"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
