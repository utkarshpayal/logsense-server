/**
 * groq.client.ts — backward-compatible shim.
 *
 * All calls previously going to Groq's cloud API now route through the local
 * OllamaClient instead. Keeping this file and its exported name (`groqClient`)
 * means every existing import continues to work without changes.
 */

import { ollamaClient, OllamaResponse } from "./ollama.client";

export type { OllamaResponse as GroqResponse };

export class GroqClient {
  isConfigured(): boolean {
    return ollamaClient.isConfigured();
  }

  async generate(
    prompt: string,
    isJson = false,
    options?: Record<string, any>
  ): Promise<OllamaResponse> {
    return ollamaClient.generate(prompt, isJson, options);
  }

  parseJson(text: string): any {
    return ollamaClient.parseJson(text);
  }
}

export const groqClient = new GroqClient();
