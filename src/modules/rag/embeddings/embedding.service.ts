import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_EMBEDDING_DIMENSION,
} from "../rag.constants";

import {
  DocumentChunk,
  EmbeddedChunk,
  RagDocument,
} from "../rag.types";

import {
  EmbedOptions,
  EmbeddingProvider,
} from "./embedding.provider";

export class EmbeddingService {
  private readonly provider: EmbeddingProvider;

  constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  /**
   * Current Provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Provider Information
   */
  getModel() {
    return this.provider.model;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }

  /**
   * Generate embedding for a single string.
   */
  async embed(
    text: string,
    options?: EmbedOptions,
  ): Promise<number[]> {
    const embedding = await this.provider.embed(text, options);

    this.validateDimensions(embedding);

    return this.normalize(embedding);
  }

  /**
   * Generate embeddings for multiple strings.
   */
  async embedBatch(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }

    const batchSize =
      options?.batchSize ?? DEFAULT_BATCH_SIZE;

    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const embeddings = await this.provider.embedBatch(
        batch,
        options,
      );

      for (const embedding of embeddings) {
        this.validateDimensions(embedding);
        results.push(this.normalize(embedding));
      }
    }

    return results;
  }

  /**
   * Embed one chunk.
   */
  async embedChunk(
    chunk: DocumentChunk,
  ): Promise<EmbeddedChunk> {
    const embedded =
      await this.provider.embedChunk(chunk);

    this.validateDimensions(embedded.embedding);

    embedded.embedding = this.normalize(
      embedded.embedding,
    );

    return embedded;
  }

  /**
   * Embed multiple chunks.
   */
  async embedChunks(
    chunks: DocumentChunk[],
  ): Promise<EmbeddedChunk[]> {
    if (!chunks.length) {
      return [];
    }

    return this.provider.embedChunks(chunks);
  }

  /**
   * Embed complete document.
   */
  async embedDocument(
    document: RagDocument,
  ): Promise<EmbeddedChunk[]> {
    return this.provider.embedDocument(document);
  }

  /**
   * Normalize vector.
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce(
        (sum, value) => sum + value * value,
        0,
      ),
    );

    if (magnitude === 0) {
      return vector;
    }

    return vector.map((value) => value / magnitude);
  }

  /**
   * Validate vector dimensions.
   */
  private validateDimensions(
    embedding: number[],
  ): void {
    const expected =
      this.provider.model.dimensions ??
      DEFAULT_EMBEDDING_DIMENSION;

    if (embedding.length !== expected) {
      throw new Error(
        `Invalid embedding dimension. Expected ${expected}, received ${embedding.length}.`,
      );
    }
  }
}