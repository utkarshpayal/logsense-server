-- =====================================================
-- Migration 008: Standardize embedding dimensions for Ollama (nomic-embed-text)
--
-- nomic-embed-text produces 768-dimensional vectors.
-- We must align all vector columns to this dimension.
-- =====================================================

-- 1. Fix the logs table embedding (was 768, may have been changed to 3072 in 007)
--    Drop and recreate so pgvector index is rebuilt cleanly.
ALTER TABLE logs DROP COLUMN IF EXISTS embedding;
ALTER TABLE logs ADD COLUMN embedding vector(768);

-- 2. Fix knowledge_documents table (was 1536, needs to match nomic-embed-text 768)
ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS embedding;
ALTER TABLE knowledge_documents ADD COLUMN embedding vector(768) NOT NULL DEFAULT array_fill(0, ARRAY[768])::vector;

-- 3. Recreate HNSW indexes for cosine similarity
DROP INDEX IF EXISTS idx_knowledge_embedding;
CREATE INDEX idx_knowledge_embedding
  ON knowledge_documents
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_logs_embedding
  ON logs
  USING hnsw (embedding vector_cosine_ops);
