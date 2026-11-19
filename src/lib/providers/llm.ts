import { llmConfig, type LlmConfig } from "@/lib/env";

/**
 * Server-side LLM adapter for Vyolab's Supercomputer Agent Orchestrator.
 * Supports OpenAI-compatible APIs, Google Gemini API, and Hugging Face Router.
 * API keys stay strictly on the server.
 */

export interface LlmJsonRequest {
  system: string;
  user: string;
  temperature?: number;
}

export class LlmAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly configOverride?: LlmConfig | null;

  constructor(opts?: { fetchImpl?: typeof fetch; config?: LlmConfig | null }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.configOverride = opts?.config;
  }

  getConfig(): LlmConfig | null {
    if (this.configOverride !== undefined) return this.configOverride;
    return llmConfig();
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  async generateJson<T>(req: LlmJsonRequest): Promise<T | null> {
    const cfg = this.getConfig();
    if (!cfg) return null;

    try {
      let text = "";
      if (cfg.provider === "gemini") {
        const res = await this.fetchImpl(
          `${cfg.apiUrl}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: req.system }] },
              contents: [{ role: "user", parts: [{ text: req.user }] }],
              generationConfig: {
                temperature: req.temperature ?? 0.5,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(45_000),
          }
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        const res = await this.fetchImpl(`${cfg.apiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: cfg.model,
            temperature: req.temperature ?? 0.5,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        text = data.choices?.[0]?.message?.content ?? "";
      }

      if (!text.trim()) return null;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
}

export const llmAdapter = new LlmAdapter();
