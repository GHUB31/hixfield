"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Cpu, Maximize2, Plus } from "lucide-react";

export function ExploreHeroPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"video" | "image" | "agentic">("video");
  const [duration, setDuration] = useState("5s");
  const [ratio, setRatio] = useState("16:9");

  function handleGo(e: React.FormEvent) {
    e.preventDefault();
    const q = prompt.trim();
    if (mode === "image") {
      router.push(q ? `/create/image?prompt=${encodeURIComponent(q)}` : "/create/image");
    } else if (mode === "agentic") {
      router.push(q ? `/campaigns?brief=${encodeURIComponent(q)}` : "/campaigns");
    } else {
      router.push(q ? `/create/video?prompt=${encodeURIComponent(q)}` : "/create/video");
    }
  }

  return (
    <form
      onSubmit={handleGo}
      className="mx-auto mt-6 w-full max-w-[740px] rounded-[20px] border border-white/[0.12] bg-[#141416]/90 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 pl-1">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/create/video")}
              aria-label="Upload reference frame"
              className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-white/75 transition-colors hover:bg-white/[0.14] hover:text-white"
            >
              <Plus className="size-4" />
            </button>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "agentic"
                  ? "Describe a brand brief. EVIE-LABS will build the full campaign."
                  : mode === "image"
                    ? "Describe any visual idea. We will generate an image."
                    : "Describe any visual idea. We will generate a video."
              }
              className="w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setMode((m) => (m === "video" ? "image" : m === "image" ? "agentic" : "video"))
              }
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/[0.12]"
            >
              <Cpu className="size-3.5 text-[#d1fe17]" aria-hidden />
              {mode === "video"
                ? "Auto · Video Router"
                : mode === "image"
                  ? "Auto · Soul / FLUX"
                  : "Supercomputer Agent"}
            </button>

            <button
              type="button"
              onClick={() => setDuration((d) => (d === "3s" ? "5s" : d === "5s" ? "10s" : "3s"))}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 font-mono text-[11px] text-white/80 transition-colors hover:bg-white/[0.12]"
            >
              <Clock className="size-3 text-white/50" aria-hidden />
              {duration}
            </button>

            <button
              type="button"
              onClick={() => setRatio((r) => (r === "16:9" ? "9:16" : r === "9:16" ? "3:4" : "16:9"))}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 font-mono text-[11px] text-white/80 transition-colors hover:bg-white/[0.12]"
            >
              <Maximize2 className="size-3 text-white/50" aria-hidden />
              {ratio}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="flex min-h-[68px] shrink-0 items-center justify-center rounded-[14px] bg-[#d1fe17] px-7 text-[12px] font-extrabold tracking-[0.06em] text-black uppercase transition-colors hover:bg-[#dcff4a] active:scale-[0.99] cursor-pointer"
        >
          GENERATE
        </button>
      </div>
    </form>
  );
}
