/**
 * OllamaClient — unified local LLM + embedding client for LogSense.
 *
 * Chat:      Ollama OpenAI-compatible endpoint (/v1/chat/completions)
 * Embeddings: Ollama native embed endpoint (/api/embed)
 *
 * Models (configured via .env):
 *   OLLAMA_CHAT_MODEL   — primary chat model (default: nemotron-3-super:cloud)
 *   OLLAMA_CHAT_FALLBACK — fallback if primary times out (default: qwen2.5-coder:7b)
 *   OLLAMA_EMBED_MODEL  — embedding model (default: nomic-embed-text, 768-dim)
 *
 * Timeouts:
 *   OLLAMA_CHAT_TIMEOUT_MS  — default 90 000 ms
 *   OLLAMA_EMBED_TIMEOUT_MS — default 30 000 ms
 */

const OLLAMA_BASE_URL    = process.env.OLLAMA_BASE_URL         ?? "http://localhost:11434";
const OLLAMA_CHAT_MODEL  = process.env.OLLAMA_CHAT_MODEL       ?? "nemotron-3-super:cloud";
const OLLAMA_CHAT_FALLBACK = process.env.OLLAMA_CHAT_FALLBACK  ?? "qwen2.5-coder:7b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL      ?? "nomic-embed-text";

const CHAT_TIMEOUT_MS  = Number(process.env.OLLAMA_CHAT_TIMEOUT_MS)  || 90_000;
const EMBED_TIMEOUT_MS = Number(process.env.OLLAMA_EMBED_TIMEOUT_MS) || 30_000;

/** Expected embedding dimension (nomic-embed-text = 768). */
export const EMBEDDING_DIM = 768;

export interface OllamaResponse {
  text: string;
  model: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ── client ─────────────────────────────────────────────────────────────────

export class OllamaClient {
  // ── Chat ──────────────────────────────────────────────────────────────────

  /**
   * Send a chat prompt and return the generated text.
   * Tries the primary model first; falls back to OLLAMA_CHAT_FALLBACK on
   * timeout or error.
   *
   * @param prompt  The full user prompt.
   * @param isJson  When true, requests JSON-object response format.
   * @param options Custom Ollama model options (e.g. temperature, num_predict).
   */
  async generate(
    prompt: string,
    isJson = false,
    options?: Record<string, any>
  ): Promise<OllamaResponse> {
    let models = [OLLAMA_CHAT_MODEL, OLLAMA_CHAT_FALLBACK].filter(
      (m, i, a) => m && a.indexOf(m) === i          // deduplicate
    );

    // Optimize: For large contexts, prioritize the faster, smaller fallback model to prevent timeout.
    // Only swap if primary is a known heavy model and fallback is a known lightweight model.
    const isPrimaryHeavy = OLLAMA_CHAT_MODEL.includes("nemotron") || OLLAMA_CHAT_MODEL.includes("qwen2.5-coder");
    const isFallbackLight = OLLAMA_CHAT_FALLBACK.includes("phi3") || OLLAMA_CHAT_FALLBACK.includes("gemma");
    if (prompt.length > 2000 && isPrimaryHeavy && isFallbackLight && models.includes(OLLAMA_CHAT_FALLBACK)) {
      models = [OLLAMA_CHAT_FALLBACK, OLLAMA_CHAT_MODEL];
      console.log(`⚡ [OllamaClient] Large prompt (${prompt.length} chars). Prioritizing faster model: ${OLLAMA_CHAT_FALLBACK}`);
    }

    let lastError: Error = new Error("No models configured");

    for (const model of models) {
      try {
        const result = await this._chat(model, prompt, isJson, options);
        return result;
      } catch (err: any) {
        const reason = err.name === "AbortError" ? "timeout" : err.message;
        console.warn(`⚠️  [OllamaClient] ${model} failed (${reason}), trying next model…`);
        lastError = err;
      }
    }

    throw lastError;
  }

  private async _chat(
    model: string,
    prompt: string,
    isJson: boolean,
    options?: Record<string, any>
  ): Promise<OllamaResponse> {
    const body: Record<string, any> = {
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      keep_alive: "20m",
      options: {
        temperature: 0,
        ...options,
      },
    };

    // Disable constrained JSON format on CPU to prevent massive processing overhead/hangs.
    // Our parseJson helper handles parsing and cleaning up normal text responses.
    // if (isJson) {
    //   body.response_format = { type: "json_object" };
    // }

    console.log(`🤖 [OllamaClient] Sending to ${model} (timeout=${CHAT_TIMEOUT_MS}ms)…, ${JSON.stringify(body.options)}`);

    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/v1/chat/completions`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      },
      CHAT_TIMEOUT_MS
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama chat error [${res.status}]: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    if (!text) {
      throw new Error(`${model} returned an empty response.`);
    }

    console.log(`✅ [OllamaClient] Response received from ${model}`);
    return { text, model };
  }

  // ── JSON helper ───────────────────────────────────────────────────────────

  /** Parse JSON from LLM text, stripping markdown fences if present. */
  parseJson(text: string): any {
    let s = text.trim();

    // Strip markdown fences
    if (s.startsWith("```")) {
      const nl = s.indexOf("\n");
      if (nl !== -1) s = s.slice(nl + 1);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();
    }

    try { return JSON.parse(s); } catch { /* continue */ }

    // Fix unescaped newlines inside string values
    try {
      const fixed = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, p) =>
        '"' + p.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"'
      );
      return JSON.parse(fixed);
    } catch { /* continue */ }

    // Brace-match fallback
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* continue */ } }

    throw new Error(`Cannot parse LLM JSON: ${s.slice(0, 300)}`);
  }

  // ── Embeddings ────────────────────────────────────────────────────────────

  /**
   * Generate a 768-dim embedding vector via nomic-embed-text.
   * Falls back to a zero-vector on failure so the server never hard-crashes.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const res = await fetchWithTimeout(
        `${OLLAMA_BASE_URL}/api/embed`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ model: OLLAMA_EMBED_MODEL, input: text }),
        },
        EMBED_TIMEOUT_MS
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama embed error [${res.status}]: ${errText}`);
      }

      const data = (await res.json()) as any;
      // /api/embed returns { embeddings: [[...]] }
      const embedding: number[] = data?.embeddings?.[0] ?? [];

      if (embedding.length === 0) {
        throw new Error("Ollama returned an empty embedding array.");
      }

      console.log(
        `🔢 [OllamaClient] Embedding dim=${embedding.length} via ${OLLAMA_EMBED_MODEL}`
      );
      return embedding;
    } catch (error: any) {
      const reason = error.name === "AbortError" ? "timeout" : error.message;
      console.error(`❌ [OllamaClient] Embedding failed (${reason}) — using zero-vector fallback`);
      return new Array(EMBEDDING_DIM).fill(0);
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return true; // Ollama is always "configured" — it runs locally
  }

  async healthCheck(): Promise<{ chat: boolean; chatFallback: boolean; embed: boolean }> {
    let models: string[] = [];

    try {
      const r = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 5_000);
      if (r.ok) {
        const data = (await r.json()) as any;
        models = (data?.models ?? []).map((m: any) => m.name as string);
      }
    } catch { /* ignore */ }

    return {
      chat:         models.includes(OLLAMA_CHAT_MODEL),
      chatFallback: models.includes(OLLAMA_CHAT_FALLBACK),
      embed:        models.includes(OLLAMA_EMBED_MODEL),
    };
  }
}

export const ollamaClient = new OllamaClient();
