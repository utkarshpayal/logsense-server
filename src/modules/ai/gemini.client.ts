/**
 * gemini.client.ts — backward-compatible shim.
 *
 * All embedding generation previously using Google Gemini's API now routes
 * through the local OllamaClient (nomic-embed-text, 768-dim).
 * Keeping this file and its exported name (`geminiClient`) means every
 * existing import continues to work without changes.
 */

import { ollamaClient } from "./ollama.client";

export class GeminiClient {
  /**
   * Generates a 768-dimensional embedding for the given text using Ollama locally.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return ollamaClient.generateEmbedding(text);
  }
}

export const geminiClient = new GeminiClient();
