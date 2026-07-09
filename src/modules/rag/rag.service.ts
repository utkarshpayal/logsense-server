import { RetrievalService } from "./retrieval/retrieval.service";
import {
  RetrievalContext,
  SearchFilters,
} from "./rag.types";

export interface RagContext {
  question: string;

  context: string;

  documents: RetrievalContext;
}

export class RagService {
  constructor(
    private readonly retrievalService: RetrievalService,
  ) {}

  /**
   * ==========================================================
   * Build Context
   * ==========================================================
   *
   * Main API used by AI.
   */
  async buildContext(
    question: string,
    filters?: SearchFilters,
  ): Promise<RagContext> {
    const retrieval =
      await this.retrievalService.retrieve({
        query: question,
        ...(filters ? { filters } : {}),
      });

    const context =
      this.createContext(retrieval);

    return {
      question,
      context,
      documents: retrieval,
    };
  }

  /**
   * ==========================================================
   * Build Prompt Context
   * ==========================================================
   */
  private createContext(
    retrieval: RetrievalContext,
  ): string {
    if (!retrieval.results.length) {
      return "";
    }

    return retrieval.results
      .map(
        (result, index) =>
          [
            `Document ${index + 1}`,
            `Score: ${result.score.toFixed(4)}`,
            result.chunk.content,
          ].join("\n"),
      )
      .join("\n\n----------------------------------------\n\n");
  }

  /**
   * ==========================================================
   * Search Only
   * ==========================================================
   */
  async search(
    question: string,
    filters?: SearchFilters,
  ) {
    return this.retrievalService.retrieve({
      query: question,
      ...(filters ? { filters } : {}),
    });
  }
}