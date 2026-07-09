CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE logs ADD COLUMN embedding vector(768);

CREATE INDEX ON logs USING hnsw (embedding vector_cosine_ops);
