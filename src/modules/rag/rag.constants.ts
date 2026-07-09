import { DocumentType } from "./rag.types";

/**
 * ============================================================
 * Chunking Configuration
 * ============================================================
 */

export const DEFAULT_CHUNK_SIZE = 1000;

export const DEFAULT_CHUNK_OVERLAP = 200;

export const MIN_CHUNK_SIZE = 300;

export const MAX_CHUNK_SIZE = 1500;

/**
 * ============================================================
 * Retrieval Configuration
 * ============================================================
 */

export const DEFAULT_TOP_K = 10;

export const DEFAULT_RERANK_TOP_K = 5;

export const MAX_TOP_K = 50;

export const MIN_SIMILARITY_SCORE = 0.75;

/**
 * ============================================================
 * Embedding Configuration
 * ============================================================
 */

export const DEFAULT_EMBEDDING_DIMENSION = 1536;

export const DEFAULT_BATCH_SIZE = 100;

/**
 * ============================================================
 * Supported Document Types
 * ============================================================
 */

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.LOG,
  DocumentType.INCIDENT,
  DocumentType.RUNBOOK,
  DocumentType.DOCUMENTATION,
  DocumentType.API,
  DocumentType.PLAYBOOK,
  DocumentType.CHANGELOG,
  DocumentType.ARCHITECTURE,
  DocumentType.FAQ,
];

/**
 * ============================================================
 * Metadata Keys
 * ============================================================
 */

export const METADATA_KEYS = {
  PROJECT_ID: "projectId",
  SERVICE: "service",
  ENVIRONMENT: "environment",
  VERSION: "version",
  TAGS: "tags",
  SOURCE: "source",
  AUTHOR: "author",
} as const;

/**
 * ============================================================
 * Prompt Configuration
 * ============================================================
 */

export const MAX_CONTEXT_DOCUMENTS = 5;

export const MAX_CONTEXT_CHARACTERS = 15000;

/**
 * ============================================================
 * Default Search Options
 * ============================================================
 */

export const DEFAULT_SEARCH_OPTIONS = {
  topK: DEFAULT_TOP_K,
  similarityThreshold: MIN_SIMILARITY_SCORE,
};

/**
 * ============================================================
 * Vector Table
 * ============================================================
 */

export const VECTOR_TABLE = "knowledge_documents";

/**
 * ============================================================
 * Supported Embedding Providers
 * ============================================================
 */

export const EMBEDDING_PROVIDERS = {
  OPENAI: "openai",
  GEMINI: "gemini",
  OLLAMA: "ollama",
  VOYAGE: "voyage",
} as const;

/**
 * ============================================================
 * Similarity Metrics
 * ============================================================
 */

export const SIMILARITY_METRIC = {
  COSINE: "cosine",
  EUCLIDEAN: "euclidean",
  INNER_PRODUCT: "inner_product",
} as const;