/** Client-side API helpers. Server errors surface with their real messages. */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new ApiError(
      data.message ?? `The request failed (${res.status}).`,
      res.status,
      data.error
    );
  }
  return data as T;
}

export async function getJSON<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url));
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function deleteJSON<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { method: "DELETE" }));
}

/** Uploads through the server proxy (which holds the key) to Higgsfield's CDN. */
export async function uploadFile(file: File, kind: "image" | "audio" = "image"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const data = await parse<{ url: string }>(await fetch("/api/uploads", { method: "POST", body: fd }));
  return data.url;
}
