import { hfAgentBaseUrl, hfKeys } from "@/lib/env";

/**
 * Official Higgsfield Supercomputer Agent API adapter.
 * Verified against github.com/higgsfield-ai/higgsfield-client (src/higgsfield_client/agents/resources.py):
 * - Base URL: https://api.higgsfield.ai
 * - Auth header: Authorization: Key {id}:{secret}
 * - Endpoints:
 *   POST /v1/agent/sessions
 *   POST /v1/agent/sessions/{session_id}/messages
 *   GET  /v1/agent/sessions/{session_id}/messages?after={message_id}
 *   POST /v1/agent/sessions/{session_id}/interrupt
 *   POST /v1/agent/media
 *   POST /v1/agent/media/{id}/confirm
 */

export type SupercomputerAccessStatus =
  | "authorized"
  | "unauthorized_403"
  | "insufficient_credits_402"
  | "missing_keys"
  | "unreachable";

export interface SupercomputerProbeResult {
  status: SupercomputerAccessStatus;
  authorized: boolean;
  baseUrl: string;
  httpStatus: number | null;
  detail: string;
  sessionId?: string;
  checkedAt: number;
}

export interface AgentSessionResponse {
  session_id: string;
  status: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  status: string;
  content?: string;
  text?: string;
  media?: Array<{ url: string; type?: string }>;
}

export interface AgentSessionMessages {
  session_id: string;
  status: string;
  messages: AgentMessage[];
}

export class SupercomputerAgentError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code: SupercomputerAccessStatus | "busy" | "backend_error" | "timeout"
  ) {
    super(message);
    this.name = "SupercomputerAgentError";
  }
}

export class HiggsfieldSupercomputerAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrlOverride?: string;

  constructor(opts?: { fetchImpl?: typeof fetch; baseUrl?: string }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.baseUrlOverride = opts?.baseUrl;
  }

  private baseUrl(): string {
    return (this.baseUrlOverride ?? hfAgentBaseUrl()).replace(/\/+$/, "");
  }

  private authHeaders(): Record<string, string> {
    const keys = hfKeys();
    if (!keys) {
      throw new SupercomputerAgentError(
        "Higgsfield API keys are not configured.",
        401,
        "missing_keys"
      );
    }
    return {
      Authorization: `Key ${keys.id}:${keys.secret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "vyolab-studio/1.0",
    };
  }

  private async request<T>(method: string, pathName: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl()}/v1/agent${pathName}`, {
      method,
      headers: this.authHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    const text = (await res.text().catch(() => "")).slice(0, 400);
    if (res.status === 401 || res.status === 403) {
      throw new SupercomputerAgentError(
        `Supercomputer Agent API access denied (HTTP ${res.status}): ${text || "account not entitled"}`,
        res.status,
        "unauthorized_403"
      );
    }
    if (res.status === 402) {
      throw new SupercomputerAgentError(
        `Insufficient Higgsfield credits for Supercomputer Agent (HTTP 402): ${text}`,
        402,
        "insufficient_credits_402"
      );
    }
    if (res.status === 409) {
      throw new SupercomputerAgentError(
        `Supercomputer session is busy processing a turn (HTTP 409).`,
        409,
        "busy"
      );
    }
    throw new SupercomputerAgentError(
      `Supercomputer Agent API HTTP ${res.status}: ${text}`,
      res.status,
      "backend_error"
    );
  }

  /**
   * Probes whether the configured Higgsfield key pair is authorized to create
   * a Supercomputer Agent session. Never fabricates access.
   */
  async probeAccess(): Promise<SupercomputerProbeResult> {
    const now = Date.now();
    const baseUrl = this.baseUrl();
    if (!hfKeys()) {
      return {
        status: "missing_keys",
        authorized: false,
        baseUrl,
        httpStatus: null,
        detail:
          "HF_API_KEY_ID / HF_API_KEY_SECRET not set; using Vyolab local Supercomputer orchestrator.",
        checkedAt: now,
      };
    }

    try {
      const session = await this.createSession({ probe: true });
      return {
        status: "authorized",
        authorized: true,
        baseUrl,
        httpStatus: 200,
        detail: `Official Higgsfield Supercomputer Agent API authorized (session ${session.session_id}).`,
        sessionId: session.session_id,
        checkedAt: now,
      };
    } catch (err) {
      if (err instanceof SupercomputerAgentError) {
        const status: SupercomputerAccessStatus =
          err.code === "unauthorized_403"
            ? "unauthorized_403"
            : err.code === "insufficient_credits_402"
              ? "insufficient_credits_402"
              : err.code === "missing_keys"
                ? "missing_keys"
                : "unreachable";
        return {
          status,
          authorized: false,
          baseUrl,
          httpStatus: err.httpStatus,
          detail: err.message,
          checkedAt: now,
        };
      }
      return {
        status: "unreachable",
        authorized: false,
        baseUrl,
        httpStatus: null,
        detail: err instanceof Error ? err.message : String(err),
        checkedAt: now,
      };
    }
  }

  async createSession(config: Record<string, unknown> = {}): Promise<AgentSessionResponse> {
    return this.request<AgentSessionResponse>("POST", "/sessions", { config });
  }

  async sendMessage(sessionId: string, content: string): Promise<{ message_id: string }> {
    return this.request<{ message_id: string }>("POST", `/sessions/${sessionId}/messages`, {
      content,
    });
  }

  async getMessages(sessionId: string, after?: string): Promise<AgentSessionMessages> {
    const qs = after ? `?after=${encodeURIComponent(after)}` : "";
    return this.request<AgentSessionMessages>("GET", `/sessions/${sessionId}/messages${qs}`);
  }

  async interrupt(sessionId: string): Promise<void> {
    await this.request<unknown>("POST", `/sessions/${sessionId}/interrupt`);
  }

  async runTurn(
    sessionId: string,
    content: string,
    opts?: { timeoutMs?: number; pollIntervalMs?: number }
  ): Promise<{ status: string; message: AgentMessage | null; messages: AgentMessage[] }> {
    const timeoutMs = opts?.timeoutMs ?? 120_000;
    const pollIntervalMs = opts?.pollIntervalMs ?? 2_000;
    const deadline = Date.now() + timeoutMs;
    const { message_id } = await this.sendMessage(sessionId, content);

    let delay = pollIntervalMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(Math.round(delay * 1.4), 10_000);
      const state = await this.getMessages(sessionId, message_id);
      const assistants = (state.messages ?? []).filter((m) => m.role === "assistant");
      for (let i = assistants.length - 1; i >= 0; i--) {
        const m = assistants[i];
        if (["completed", "failed", "canceled"].includes(m.status)) {
          return { status: m.status, message: m, messages: state.messages };
        }
      }
      if (state.status === "awaiting_input") {
        return {
          status: "awaiting_input",
          message: assistants[assistants.length - 1] ?? null,
          messages: state.messages,
        };
      }
    }

    throw new SupercomputerAgentError(
      `Supercomputer session ${sessionId} exceeded timeout (${Math.round(timeoutMs / 1000)}s).`,
      408,
      "timeout"
    );
  }
}

export const supercomputerAgentAdapter = new HiggsfieldSupercomputerAdapter();
