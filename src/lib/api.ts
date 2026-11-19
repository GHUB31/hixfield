import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MissingKeysError } from "@/lib/higgsfield/client";
import { PublishingApprovalRequiredError } from "@/lib/providers/postiz";
import { NoRouteAvailableError } from "@/lib/router";
import { BudgetExceededError } from "@/lib/spend";

/** Uniform error responses. Upstream messages pass through honestly — no fake progress, no masked failures. */
export function apiError(err: unknown): NextResponse {
  if (err instanceof MissingKeysError) {
    return NextResponse.json({ error: "missing_keys", message: err.message }, { status: 503 });
  }
  if (err instanceof BudgetExceededError) {
    return NextResponse.json({ error: "budget_exceeded", message: err.message }, { status: 402 });
  }
  if (err instanceof PublishingApprovalRequiredError) {
    return NextResponse.json({ error: "approval_required", message: err.message }, { status: 403 });
  }
  if (err instanceof NoRouteAvailableError) {
    return NextResponse.json(
      { error: "no_route_available", message: err.message, candidates: err.candidates },
      { status: 503 }
    );
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
      { error: "auth", message: "The API rejected these keys. Check server-side credentials." },
      { status: 502 }
    );
  }
  if (statusCode === 402) {
    return NextResponse.json(
      { error: "credits", message: "Not enough credits on your provider account." },
      { status: 502 }
    );
  }
  if (statusCode === 400 || statusCode === 422) {
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }
  return NextResponse.json({ error: "upstream", message }, { status: 502 });
}
