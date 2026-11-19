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
  GitFork,
  Image as ImageIcon,
  Send,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { getJSON } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "GHUB31/hixfield";

const STUDIO_ITEMS = [
  { href: "/create/video", label: "Video", icon: Clapperboard },
  { href: "/create/image", label: "Image", icon: ImageIcon },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/speak", label: "Speak", icon: AudioLines },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/playground", label: "Playground", icon: FlaskConical },
];

const PLATFORM_ITEMS = [
  { href: "/campaigns", label: "Campaigns", icon: Sparkles },
  { href: "/skills", label: "Skills", icon: Wand2 },
  { href: "/publish", label: "Publish", icon: Send },
  { href: "/routing", label: "Routing", icon: Cpu },
];

const MOBILE_ITEMS = [
  STUDIO_ITEMS[0],
  STUDIO_ITEMS[1],
  PLATFORM_ITEMS[0],
  PLATFORM_ITEMS[2],
  STUDIO_ITEMS[4],
  PLATFORM_ITEMS[3],
];

interface StatusSnapshot {
  hasKeys: boolean;
  providers?: Record<string, { available: boolean }>;
  spend?: { dailySpentUsd: number; dailyBudgetUsd: number };
}

function StatusChip() {
  const [status, setStatus] = useState<StatusSnapshot | null>(null);
  useEffect(() => {
    getJSON<StatusSnapshot>("/api/status")
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;
  const liveCount = Object.values(status.providers ?? {}).filter((p) => p.available).length;
  const hasCloudOrGpu =
    Boolean(status.providers?.higgsfield?.available) ||
    Boolean(status.providers?.comfyui?.available) ||
    Boolean(status.providers?.huggingface?.available);

  return (
    <Link
      href="/routing"
      className="flex flex-col gap-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 transition-colors hover:border-ink-600"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 rounded-full",
            hasCloudOrGpu ? "bg-lime-400" : "bg-amber animate-lamp"
          )}
          aria-hidden
        />
        <span className="font-mono text-[11px] tracking-wide text-ink-300">
          {liveCount} route{liveCount === 1 ? "" : "s"} ready
        </span>
      </div>
      {status.spend && (
        <span className="font-mono text-[10px] text-ink-400">
          ${status.spend.dailySpentUsd.toFixed(2)} / ${status.spend.dailyBudgetUsd.toFixed(0)} today
        </span>
      )}
    </Link>
  );
}

export function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Vyolab Studio"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ink-800 bg-ink-950 px-4 py-6 lg:flex"
      >
        <Link href="/" className="px-2">
          <span
            className="block text-lg font-bold tracking-wide text-ink-50"
            style={{ fontStretch: "125%" }}
          >
            VYOLAB<span className="text-lime-400">.</span>
          </span>
          <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-ink-400">
            HIXFIELD CORE
          </span>
        </Link>

        <div className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
          <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
            Create
          </p>
          {STUDIO_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-ink-800 font-medium text-lime-400"
                    : "text-ink-300 hover:bg-ink-850 hover:text-ink-50"
                )}
              >
                <Icon className="size-[17px]" aria-hidden />
                {label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-ink-800" />
          <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
            Orchestrate
          </p>
          {PLATFORM_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-ink-800 font-medium text-lime-400"
                    : "text-ink-300 hover:bg-ink-850 hover:text-ink-50"
                )}
              >
                <Icon className="size-[17px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <StatusChip />
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100"
          >
            <GitFork className="size-3.5" aria-hidden />
            <span className="font-mono">{REPO}</span>
          </a>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Vyolab Studio"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur lg:hidden"
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
