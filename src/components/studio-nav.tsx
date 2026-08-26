"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  Clapperboard,
  FlaskConical,
  FolderOpen,
  Github,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { getJSON } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "Mukhsin0508/hixfield";

const ITEMS = [
  { href: "/create/video", label: "Video", icon: Clapperboard },
  { href: "/create/image", label: "Image", icon: ImageIcon },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/speak", label: "Speak", icon: AudioLines },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/playground", label: "Playground", icon: FlaskConical },
];

function ApiChip() {
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);
  useEffect(() => {
    getJSON<{ hasKeys: boolean }>("/api/status")
      .then((s) => setHasKeys(s.hasKeys))
      .catch(() => setHasKeys(null));
  }, []);
  if (hasKeys === null) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <span
        className={cn(
          "size-1.5 rounded-full",
          hasKeys ? "bg-lime-400" : "bg-amber animate-lamp"
        )}
        aria-hidden
      />
      <span className="font-mono text-[11px] tracking-wide text-ink-300">
        {hasKeys ? "API connected" : "No API key"}
      </span>
    </div>
  );
}

export function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Studio"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ink-800 bg-ink-950 px-4 py-6 lg:flex"
      >
        <Link href="/" className="px-2 text-lg font-bold tracking-wide text-ink-50" style={{ fontStretch: "125%" }}>
          HIXFIELD<span className="text-lime-400">.</span>
        </Link>

        <div className="mt-8 flex flex-1 flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-ink-800 font-medium text-lime-400"
                    : "text-ink-300 hover:bg-ink-850 hover:text-ink-50"
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          <ApiChip />
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-50"
          >
            <Github className="size-[18px]" aria-hidden />
            Star on GitHub
          </a>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Studio"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-6">
          {ITEMS.map(({ href, label, icon: Icon }) => {
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
