"use client";

import { useRef, useState } from "react";
import { Plus, UploadCloud, X } from "lucide-react";
import { uploadFile } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export const MAX_PHOTOS = 10;

export type PhotoItem = {
  key: string;
  /** Local object URL, shown immediately while the upload runs. */
  previewUrl: string;
  status: "uploading" | "done" | "error";
  /** CDN URL, set once the upload finishes. */
  url?: string;
  error?: string;
};

let seq = 0;

function Spinner() {
  return (
    <svg className="size-5 animate-spin text-lime-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Multi-photo uploader for character training. Uploads every file through
 * the server proxy and keeps a thumbnail row the parent can read URLs from.
 */
export function PhotoUploader({
  photos,
  setPhotos,
  disabled = false,
}: {
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const atMax = photos.length >= MAX_PHOTOS;

  async function uploadOne(file: File, key: string) {
    try {
      const url = await uploadFile(file, "image");
      setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, status: "done" as const, url } : p)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Remove the photo and try again.";
      setPhotos((prev) =>
        prev.map((p) => (p.key === key ? { ...p, status: "error" as const, error: message } : p))
      );
    }
  }

  function addFiles(fileList: FileList | null) {
    if (disabled || !fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const room = Math.max(0, MAX_PHOTOS - photos.length);
    const accepted = files.slice(0, room);
    setNotice(files.length > room ? `You can add up to ${MAX_PHOTOS} photos.` : null);
    if (accepted.length === 0) return;

    const items: PhotoItem[] = accepted.map(() => ({
      key: `photo-${++seq}`,
      previewUrl: "",
      status: "uploading",
    }));
    items.forEach((item, i) => {
      item.previewUrl = URL.createObjectURL(accepted[i]);
    });
    setPhotos((prev) => [...prev, ...items]);
    items.forEach((item, i) => void uploadOne(accepted[i], item.key));
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
    setNotice(null);
  }

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !atMax) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
  };

  return (
    <div className="flex flex-col">
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          {...dropProps}
          className={cn(
            "flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors",
            dragging
              ? "border-lime-400 bg-lime-400/5 text-lime-300"
              : "border-ink-600 bg-ink-900 text-ink-300 hover:border-ink-400 hover:text-ink-100",
            disabled && "opacity-50"
          )}
        >
          <UploadCloud className="size-5" aria-hidden />
          <span>
            Drop photos here, or <span className="text-lime-400">browse</span>
          </span>
        </button>
      ) : (
        <div
          {...dropProps}
          className={cn(
            "grid grid-cols-4 gap-2 rounded-lg transition-colors sm:grid-cols-5 lg:grid-cols-4",
            dragging && "outline outline-2 outline-offset-4 outline-lime-400"
          )}
        >
          {photos.map((p) => (
            <div
              key={p.key}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-ink-850",
                p.status === "error" ? "border-danger/60" : "border-ink-700"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" className="size-full object-cover" />
              {p.status === "uploading" && (
                <div className="absolute inset-0 grid place-items-center bg-ink-950/60">
                  <Spinner />
                </div>
              )}
              {p.status === "error" && (
                <div className="absolute inset-0 grid place-items-center bg-ink-950/70 px-1 text-center text-[10px] leading-tight text-danger">
                  Upload failed
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-ink-950/80 text-ink-300 backdrop-blur transition-colors hover:text-ink-50"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}

          {!atMax && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-label="Add photos"
              className={cn(
                "grid aspect-square place-items-center rounded-lg border border-dashed border-ink-600 text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-100",
                disabled && "opacity-50"
              )}
            >
              <Plus className="size-5" aria-hidden />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Choose photos"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {notice && <p className="mt-1.5 text-[13px] text-amber">{notice}</p>}
    </div>
  );
}
