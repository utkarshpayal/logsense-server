-- =====================================================
-- Enable pgvector Extension
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- Knowledge Documents
-- =====================================================

CREATE TABLE IF NOT EXISTS knowledge_documents
(
    id UUID PRIMARY KEY,

    project_id UUID NOT NULL,

    document_id UUID NOT NULL,

    title TEXT NOT NULL,

    type VARCHAR(50) NOT NULL,

    content TEXT NOT NULL,

    chunk_index INTEGER NOT NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    embedding VECTOR(1536) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Vector Similarity Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
ON knowledge_documents
USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- Project Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_project
ON knowledge_documents(project_id);

-- =====================================================
-- Document Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_document
ON knowledge_documents(document_id);

-- =====================================================
-- Document Type
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_type
ON knowledge_documents(type);

-- =====================================================
-- JSON Metadata Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_metadata
ON knowledge_documents
USING GIN(metadata);

-- =====================================================
-- Full Text Search
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_content
ON knowledge_documents
USING GIN(to_tsvector('english', content));

-- =====================================================
-- Updated At Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_knowledge_updated_at
ON knowledge_documents;

CREATE TRIGGER trg_update_knowledge_updated_at
BEFORE UPDATE
ON knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();