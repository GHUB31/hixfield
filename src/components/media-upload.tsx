"use client";

import { useId, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { uploadFile } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

/**
 * Drop zone that uploads through the server proxy to Higgsfield's CDN and
 * hands back the public URL generations need.
 */
export function MediaUpload({
  label,
  kind = "image",
  value,
  onChange,
  help,
  className,
}: {
  label: string;
  kind?: "image" | "audio";
  value: string | null;
  onChange: (url: string | null) => void;
  help?: string;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = kind === "audio" ? "audio/*" : "image/*";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadFile(file, kind));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={inputId} className="mb-1.5 text-[13px] font-medium text-ink-300">
        {label}
      </label>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-52 w-full object-cover" />
          ) : (
            <audio controls src={value} className="w-full p-2" />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${kind}`}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-ink-950/80 text-ink-300 backdrop-blur transition-colors hover:text-ink-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors",
            dragging
              ? "border-lime-400 bg-lime-400/5 text-lime-300"
              : "border-ink-600 bg-ink-900 text-ink-300 hover:border-ink-400 hover:text-ink-100"
          )}
          disabled={busy}
        >
          {busy ? (
            <>
              <svg className="size-5 animate-spin text-lime-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="size-5" aria-hidden />
              <span>
                Drop {kind === "audio" ? "an audio file" : "an image"} here, or{" "}
                <span className="text-lime-400">browse</span>
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error ? (
        <p className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : help ? (
        <p className="mt-1.5 text-[13px] text-ink-400">{help}</p>
      ) : null}
    </div>
  );
}
