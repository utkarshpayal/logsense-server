import {
  EmbeddedChunk,
  SearchFilters,
  SearchResult,
} from "../rag.types";

export interface SimilaritySearchOptions {
  embedding: number[];
  topK: number;
  filters?: SearchFilters;
}

export interface VectorRepository {
  /**
   * Insert one embedded chunk.
   */
  insert(chunk: EmbeddedChunk): Promise<void>;

  /**
   * Insert multiple chunks.
   */
  insertMany(chunks: EmbeddedChunk[]): Promise<void>;

  /**
   * Delete all chunks of a document.
   */
  deleteDocument(documentId: string): Promise<void>;

  /**
   * Update document embeddings.
   */
  updateDocument(
    documentId: string,
    chunks: EmbeddedChunk[],
  ): Promise<void>;

  /**
   * Perform similarity search.
   */
  similaritySearch(
    options: SimilaritySearchOptions,
  ): Promise<SearchResult[]>;

  /**
   * Find chunk by id.
   */
  findById(
    chunkId: string,
  ): Promise<EmbeddedChunk | null>;

  /**
   * Count chunks.
   */
  count(projectId: string): Promise<number>;

  /**
   * Delete everything for a project.
   */
  clear(projectId: string): Promise<void>;

  /**
   * Repository health.
   */
  healthCheck(): Promise<boolean>;
}