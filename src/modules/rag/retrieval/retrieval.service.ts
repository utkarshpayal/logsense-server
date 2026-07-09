import {
  DEFAULT_RERANK_TOP_K,
  DEFAULT_TOP_K,
} from "../rag.constants";

import {
  RetrievalContext,
  SearchRequest,
  SearchResult,
} from "../rag.types";

import { EmbeddingService } from "../embeddings/embedding.service";
import { VectorRepository } from "../repository/vector.repository";

export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorRepository: VectorRepository,
  ) {}

  /**
   * ======================================================
   * Search Knowledge Base
   * ======================================================
   */
  async retrieve(
    request: SearchRequest,
  ): Promise<RetrievalContext> {
    const embedding = await this.embeddingService.embed(
      request.query,
    );

    const results = await this.vectorRepository.similaritySearch({
      embedding,
      topK: request.topK ?? DEFAULT_TOP_K,
      // similaritySearch expects a non-optional filters property; when the
      // incoming request.filters is undefined we pass an empty object cast
      // to satisfy the type without changing external types.
      filters: (request.filters ?? ({} as any)) as any,
    });

    const reranked =
      this.rerank(results);

    return {
      query: request.query,
      results: reranked,
    };
  }

  /**
   * ======================================================
   * Retrieve Similar Documents
   * ======================================================
   */
  async retrieveSimilar(
    text: string,
    topK = DEFAULT_TOP_K,
  ): Promise<SearchResult[]> {
    const embedding =
      await this.embeddingService.embed(text);

    return this.vectorRepository.similaritySearch({
      embedding,
      topK,
    });
  }

  /**
   * ======================================================
   * Basic Reranking
   * ======================================================
   */
  private rerank(
    results: SearchResult[],
  ): SearchResult[] {
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, DEFAULT_RERANK_TOP_K);
  }
}