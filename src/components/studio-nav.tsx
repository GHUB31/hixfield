"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  Clapperboard,
  Cpu,
  FlaskConical,
  FolderOpen,
  Image as ImageIcon,
  Send,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { getJSON } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/create/video", label: "Video", icon: Clapperboard },
  { href: "/create/image", label: "Image", icon: ImageIcon },
  { href: "/campaigns", label: "Supercomputer", icon: Sparkles },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/speak", label: "Speak", icon: AudioLines },
  { href: "/skills", label: "Skills", icon: Wand2 },
  { href: "/playground", label: "Models", icon: FlaskConical },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/publish", label: "Publish", icon: Send },
];

const MOBILE_ITEMS = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[7],
  NAV_ITEMS[8],
  { href: "/routing", label: "Router", icon: Cpu },
];

interface StatusSnapshot {
  hasKeys: boolean;
  providers?: Record<string, { available: boolean }>;
  spend?: { dailySpentUsd: number; dailyBudgetUsd: number };
}

function RouterStatusPill() {
  const [status, setStatus] = useState<StatusSnapshot | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    getJSON<StatusSnapshot>("/api/status")
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  const hasCloudOrGpu =
    Boolean(status?.providers?.higgsfield?.available) ||
    Boolean(status?.providers?.comfyui?.available) ||
    Boolean(status?.providers?.huggingface?.available);
  const active = pathname.startsWith("/routing");

  return (
    <Link
      href="/routing"
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors",
        active
          ? "border-lime-400/50 bg-lime-400/10 text-lime-400"
          : "border-ink-700/90 bg-ink-900/90 text-ink-300 hover:border-ink-600 hover:text-ink-50"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          hasCloudOrGpu ? "bg-lime-400" : "bg-amber animate-lamp"
        )}
        aria-hidden
      />
      <span>{hasCloudOrGpu ? "Cloud / GPU live" : "Router · $0 local"}</span>
      {status?.spend && (
        <span className="hidden border-l border-ink-700 pl-2 text-ink-400 sm:inline">
          ${status.spend.dailySpentUsd.toFixed(2)}/${status.spend.dailyBudgetUsd.toFixed(0)}
        </span>
      )}
    </Link>
  );
}

export function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Higgsfield-style slim sticky top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-[#060608]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-baseline gap-2">
            <span
              className="text-base font-bold tracking-wide text-ink-50"
              style={{ fontStretch: "125%" }}
            >
              VYOLAB<span className="text-lime-400">.</span>
            </span>
            <span className="hidden rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-ink-400 xl:inline">
              STUDIO
            </span>
          </Link>

          <nav
            aria-label="Vyolab Studio"
            className="hidden items-center gap-0.5 overflow-x-auto rounded-full border border-ink-800/90 bg-ink-900/75 p-1 lg:flex"
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-ink-800 font-medium text-lime-400 shadow-[inset_0_0_0_1px_rgba(204,255,0,0.22)]"
                      : "text-ink-300 hover:bg-ink-850 hover:text-ink-50"
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <RouterStatusPill />
          </div>
        </div>
      </header>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Vyolab Studio Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur-xl lg:hidden"
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
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                  active ? "text-lime-400" : "text-ink-400 hover:text-ink-100"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
