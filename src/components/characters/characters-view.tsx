"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError, getJSON, postJSON } from "@/lib/fetcher";
import type { CharacterRecord } from "@/lib/higgsfield/types";
import { cn } from "@/lib/utils";
import { CharacterCard } from "./character-card";
import { PhotoUploader, MAX_PHOTOS, type PhotoItem } from "./photo-uploader";

/** Character training ends at completed or failed; everything else is still moving. */
function isCharacterTerminal(status: string): boolean {
  return status === "completed" || status === "failed";
}

function MissingKeysNotice() {
  return (
    <div className="rounded-lg border border-amber/30 bg-amber/10 px-3.5 py-2.5 text-[13px] text-amber">
      Add your Higgsfield API key first. Instructions are in the banner above.
    </div>
  );
}

export function CharactersView() {
  const [characters, setCharacters] = useState<CharacterRecord[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);

  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await getJSON<{ characters: CharacterRecord[] }>("/api/characters");
      setCharacters(data.characters);
      setListError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setMissingKeys(true);
        return;
      }
      setListError(err instanceof Error ? err.message : "The request failed.");
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // While any character is still preparing or training, keep the list fresh.
  const hasActive = characters?.some((c) => !isCharacterTerminal(c.status)) ?? false;
  useEffect(() => {
    if (!hasActive || missingKeys) return;
    const timer = setInterval(() => void fetchList(), 5000);
    return () => clearInterval(timer);
  }, [hasActive, missingKeys, fetchList]);

  // Free local photo previews if the user leaves mid-form.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const uploadedUrls = photos.flatMap((p) => (p.status === "done" && p.url ? [p.url] : []));
  const anyUploading = photos.some((p) => p.status === "uploading");
  const canCreate = name.trim().length > 0 && uploadedUrls.length >= 2 && !anyUploading && !creating;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate || missingKeys) return;
    setCreating(true);
    setSubmitError(null);
    try {
      const { character } = await postJSON<{ character: CharacterRecord }>("/api/characters", {
        name: name.trim(),
        image_urls: uploadedUrls,
      });
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setName("");
      setCharacters((prev) => (prev ? [character, ...prev] : [character]));
    } catch (err) {
      if (err instanceof ApiError && err.code === "missing_keys") {
        setMissingKeys(true);
      } else {
        setSubmitError(err instanceof Error ? err.message : "The request failed.");
      }
    } finally {
      setCreating(false);
    }
  }

  function focusNameInput() {
    const el = document.getElementById("character-name");
    if (el instanceof HTMLInputElement) {
      el.scrollIntoView({ block: "center" });
      el.focus({ preventScroll: true });
    }
  }

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Characters</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Train a consistent character from a few photos, then use it on the Image page.
        </p>
      </header>

      {missingKeys && (
        <div className="animate-rise rise-1 mt-6">
          <MissingKeysNotice />
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start",
          missingKeys ? "mt-4" : "mt-6"
        )}
      >
          <aside className="animate-rise rise-1 lg:order-2">
            <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
              <h2 className="text-base font-semibold text-ink-50">New character</h2>

              <form className="mt-4 flex flex-col gap-4" onSubmit={handleCreate}>
                <Field label="Name" htmlFor="character-name">
                  <Input
                    id="character-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name this character"
                    maxLength={80}
                    disabled={creating || missingKeys}
                  />
                </Field>

                <div className="flex flex-col">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink-300">Photos</span>
                    <span className="font-mono text-[11px] text-ink-400">
                      {photos.length} of {MAX_PHOTOS} photos
                    </span>
                  </div>
                  <PhotoUploader
                    photos={photos}
                    setPhotos={setPhotos}
                    disabled={creating || missingKeys}
                  />
                  <p className="mt-1.5 text-[13px] text-ink-400">
                    Clear, well-lit photos of the same person. Different angles help.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={!canCreate || missingKeys} loading={creating}>
                    Start training
                  </Button>
                  {!creating && uploadedUrls.length < 2 && photos.length > 0 && !anyUploading && (
                    <p className="text-[13px] text-ink-400">Add at least 2 photos to start training.</p>
                  )}
                  {submitError && <p className="text-[13px] text-danger">{submitError}</p>}
                </div>
              </form>
            </div>
          </aside>

          <section className="animate-rise rise-2 lg:order-1" aria-label="Your characters">
            {missingKeys ? (
              <EmptyState
                icon={<Users />}
                title="Characters are Soul IDs"
                body="Train a consistent character from a few photos, then render the same person in any scene. The character list and training flow light up once your keys are set."
              />
            ) : characters ? (
              characters.length === 0 ? (
                <EmptyState
                  icon={<Users />}
                  title="No characters yet"
                  body="Upload a few photos of the same person and Soul renders them consistently in any scene."
                  action={
                    <Button variant="secondary" onClick={focusNameInput}>
                      Create your first character
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} character={c} />
                  ))}
                </div>
              )
            ) : listError ? (
              <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                <p className="text-sm text-danger">{listError}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void fetchList()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-xl bg-ink-850" />
                ))}
              </div>
            )}
          </section>
      </div>
    </div>
  );
}
