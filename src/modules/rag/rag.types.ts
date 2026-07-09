export enum DocumentType {
  LOG = "LOG",
  INCIDENT = "INCIDENT",
  RUNBOOK = "RUNBOOK",
  DOCUMENTATION = "DOCUMENTATION",
  API = "API",
  PLAYBOOK = "PLAYBOOK",
  CHANGELOG = "CHANGELOG",
  ARCHITECTURE = "ARCHITECTURE",
  FAQ = "FAQ",
}

export interface DocumentMetadata {
  projectId: string;
  service?: string;
  environment?: string;
  version?: string;
  tags?: string[];
  source?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RagDocument {
  id: string;
  title: string;
  type: DocumentType;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  type: DocumentType;
  content: string;
  metadata: DocumentMetadata;
}

export interface EmbeddingVector {
  values: number[];
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface SearchFilters {
  projectId: string;
  service?: string;
  environment?: string;
  type?: DocumentType[];
  tags?: string[];
}

export interface SearchRequest {
  query: string;
  topK?: number;
  filters?: SearchFilters;
}

export interface SearchResult {
  id: string;
  score: number;
  chunk: DocumentChunk;
}

export interface RetrievalContext {
  query: string;
  results: SearchResult[];
}

export interface EmbeddingProvider {
  readonly provider: string;

  embed(text: string): Promise<number[]>;

  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface Chunker {
  chunk(document: RagDocument): Promise<DocumentChunk[]>;
}

export interface Retriever {
  search(request: SearchRequest): Promise<SearchResult[]>;
}

export interface VectorStore {
  insert(chunks: EmbeddedChunk[]): Promise<void>;

  similaritySearch(
    embedding: number[],
    topK: number,
    filters?: SearchFilters,
  ): Promise<SearchResult[]>;

  delete(documentId: string): Promise<void>;
}

export interface Reranker {
  rerank(
    query: string,
    results: SearchResult[],
  ): Promise<SearchResult[]>;
}