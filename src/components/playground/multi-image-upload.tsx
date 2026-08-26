"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadFile } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

/**
 * Multi-image uploader for schema fields of type "images".
 * Uploads through the server proxy, shows thumbnails with remove buttons,
 * and caps the list at `max`.
 */
export function MultiImageUpload({
  label,
  value,
  onChange,
  max = 4,
  help,
  className,
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  help?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const room = Math.max(0, max - value.length);
  const empty = value.length === 0 && pending === 0;

  async function handleFiles(files: File[]) {
    if (room <= 0) return;
    const batch = files.slice(0, room);
    if (batch.length === 0) return;
    setError(null);
    setPending(batch.length);
    const uploaded: string[] = [];
    let failure: string | null = null;
    for (const file of batch) {
      try {
        uploaded.push(await uploadFile(file, "image"));
      } catch (err) {
        failure = err instanceof Error ? err.message : "Upload failed. Try again.";
      } finally {
        setPending((n) => Math.max(0, n - 1));
      }
    }
    if (uploaded.length > 0) onChange([...value, ...uploaded].slice(0, max));
    if (failure) setError(failure);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="mb-1.5 text-[13px] font-medium text-ink-300">{label}</span>

      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative h-20 overflow-hidden rounded-lg border border-ink-700 bg-ink-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Uploaded image ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove image ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-ink-950/80 text-ink-300 backdrop-blur transition-colors hover:text-ink-50"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: pending }).map((_, i) => (
          <div key={`pending-${i}`} className="h-20 animate-pulse rounded-lg bg-ink-850" aria-hidden />
        ))}

        {room - pending > 0 && (
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
              void handleFiles(Array.from(e.dataTransfer.files));
            }}
            aria-label={`Add image to ${label}`}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs transition-colors",
              empty ? "col-span-3 min-h-28 text-sm" : "h-20",
              dragging
                ? "border-lime-400 bg-lime-400/5 text-lime-300"
                : "border-ink-600 bg-ink-900 text-ink-300 hover:border-ink-400 hover:text-ink-100"
            )}
          >
            <ImagePlus className={cn(empty ? "size-5" : "size-4")} aria-hidden />
            <span>
              {empty ? (
                <>
                  Drop images here, or <span className="text-lime-400">browse</span>
                </>
              ) : (
                "Add"
              )}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = "";
          void handleFiles(files);
        }}
      />

      {error ? (
        <p className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : room === 0 && pending === 0 ? (
        <p className="mt-1.5 text-[13px] text-ink-400">
          <span className="font-mono">
            {value.length}/{max}
          </span>{" "}
          added. Remove one to swap it.
        </p>
      ) : help ? (
        <p className="mt-1.5 text-[13px] text-ink-400">{help}</p>
      ) : max > 1 ? (
        <p className="mt-1.5 text-[13px] text-ink-400">
          Up to <span className="font-mono">{max}</span> images.
        </p>
      ) : null}
    </div>
  );
}
