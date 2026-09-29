-- Persistent Indian Kanoon retrieval corpus for the RAG pipeline.
-- Embeddings are stored as JSONB so the corpus remains usable when pgvector is unavailable.

CREATE TABLE IF NOT EXISTS legal_judgment_chunks (
    chunk_id VARCHAR(255) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    kanoon_id VARCHAR(100) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_type VARCHAR(40) NOT NULL DEFAULT 'facts',
    chunk_text TEXT NOT NULL,
    embedding JSONB,
    source_url TEXT,
    citation VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (kanoon_id, chunk_index),
    CHECK (embedding IS NULL OR jsonb_typeof(embedding) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_legal_judgment_chunks_case
    ON legal_judgment_chunks(case_id);

CREATE INDEX IF NOT EXISTS idx_legal_judgment_chunks_kanoon
    ON legal_judgment_chunks(kanoon_id);

CREATE INDEX IF NOT EXISTS idx_legal_judgment_chunks_text
    ON legal_judgment_chunks USING GIN (to_tsvector('simple', chunk_text));
