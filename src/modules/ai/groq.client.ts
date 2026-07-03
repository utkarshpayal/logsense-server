import Groq from "groq-sdk";

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3.6-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

export interface GroqResponse {
  text: string;
  model: string;
}

/**
 * Shared Groq LLM client with automatic model fallback.
 * All AI sub-components use this — never instantiate Groq directly.
 */
export class GroqClient {
  private _client: Groq | null = null;

  isConfigured(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  private client(): Groq {
    if (!this._client) {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("GROQ_API_KEY is not configured on this server.");
      this._client = new Groq({ apiKey: key });
    }
    return this._client;
  }

  async generate(prompt: string, isJson = false): Promise<GroqResponse> {
    const groq = this.client();
    let last: any;
    for (const model of MODELS) {
      try {
        const opts: any = {
          messages: [{ role: "user", content: prompt }],
          model,
        };
        if (isJson) opts.response_format = { type: "json_object" };
        const res = await groq.chat.completions.create(opts);
        const text = res.choices[0]?.message?.content ?? "";
        console.log(`🤖 [GroqClient] ${model}`);
        return { text, model };
      } catch (e: any) {
        console.warn(`⚠️  [GroqClient] ${model} failed: ${e.message}`);
        last = e;
      }
    }
    throw last ?? new Error("All Groq models failed");
  }

  parseJson(text: string): any {
    let s = text.trim();
    // Strip markdown fences
    if (s.startsWith("```")) {
      const nl = s.indexOf("\n");
      if (nl !== -1) s = s.slice(nl + 1);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();
    }
    // Direct parse
    try { return JSON.parse(s); } catch { /* */ }
    // Fix unescaped newlines inside string values
    try {
      const fixed = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, p) =>
        '"' + p.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"'
      );
      return JSON.parse(fixed);
    } catch { /* */ }
    // Brace-match fallback
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
    throw new Error(`Cannot parse LLM JSON: ${s.slice(0, 300)}`);
  }
}

export const groqClient = new GroqClient();
