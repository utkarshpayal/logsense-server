-- Migration 007: Remove broken 3072-dim vector column
-- (3072 dims exceeds HNSW max of 2000 — we use 768-dim via nomic-embed-text instead)
ALTER TABLE logs DROP COLUMN IF EXISTS embedding;
ALTER TABLE logs ADD COLUMN embedding vector(768);
