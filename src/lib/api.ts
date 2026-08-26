import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MissingKeysError } from "@/lib/higgsfield/client";

/** Uniform error responses. Upstream messages pass through honestly — no fake progress, no masked failures. */
export function apiError(err: unknown): NextResponse {
  if (err instanceof MissingKeysError) {
    return NextResponse.json({ error: "missing_keys", message: err.message }, { status: 503 });
  }
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }
  const statusCode = (err as { statusCode?: number }).statusCode;
  const message = err instanceof Error ? err.message : String(err);
  if (statusCode === 401 || statusCode === 403) {
    return NextResponse.json(
      { error: "auth", message: "The API rejected these keys. Check HF_API_KEY_ID / HF_API_KEY_SECRET." },
      { status: 502 }
    );
  }
  if (statusCode === 402) {
    return NextResponse.json(
      { error: "credits", message: "Not enough credits on your Higgsfield account." },
      { status: 502 }
    );
  }
  if (statusCode === 400 || statusCode === 422) {
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }
  return NextResponse.json({ error: "upstream", message }, { status: 502 });
}
