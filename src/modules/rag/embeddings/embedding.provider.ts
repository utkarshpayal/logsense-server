import {
  DocumentChunk,
  EmbeddedChunk,
  RagDocument,
} from "../rag.types";

/**
 * ============================================================
 * Embedding Model Information
 * ============================================================
 */
export interface EmbeddingModelInfo {
  provider: string;
  model: string;
  dimensions: number;
}

/**
 * ============================================================
 * Embedding Options
 * ============================================================
 */
export interface EmbedOptions {
  batchSize?: number;
}

/**
 * ============================================================
 * Embedding Provider Contract
 * ============================================================
 *
 * Every embedding provider (OpenAI, Ollama, Gemini, etc.)
 * must implement this interface.
 */
export interface EmbeddingProvider {
  /**
   * Provider name
   */
  readonly provider: string;

  /**
   * Model information
   */
  readonly model: EmbeddingModelInfo;

  /**
   * Generate embedding for a single string.
   */
  embed(
    text: string,
    options?: EmbedOptions,
  ): Promise<number[]>;

  /**
   * Generate embeddings for multiple strings.
   */
  embedBatch(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<number[][]>;

  /**
   * Generate embedding for a chunk.
   */
  embedChunk(
    chunk: DocumentChunk,
  ): Promise<EmbeddedChunk>;

  /**
   * Generate embeddings for all chunks.
   */
  embedChunks(
    chunks: DocumentChunk[],
  ): Promise<EmbeddedChunk[]>;

  /**
   * Chunk a document and embed every chunk.
   */
  embedDocument(
    document: RagDocument,
  ): Promise<EmbeddedChunk[]>;

  /**
   * Validate connection/model availability.
   */
  healthCheck(): Promise<boolean>;
}