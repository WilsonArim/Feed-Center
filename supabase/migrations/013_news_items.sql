-- Enable pgvector extension for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- News items table with vector embeddings for deduplication
CREATE TABLE IF NOT EXISTS news_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    source_url      TEXT NOT NULL UNIQUE,
    source_name     TEXT NOT NULL,
    topic_primary   TEXT NOT NULL,
    tags            TEXT[] DEFAULT '{}',
    tag_confidence  FLOAT DEFAULT 0,
    score           FLOAT DEFAULT 0,
    embedding       vector(1536),       -- text-embedding-3-small dimension
    dedup_group_id  UUID,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_news_topic ON news_items (topic_primary);
CREATE INDEX idx_news_score ON news_items (score DESC);
CREATE INDEX idx_news_created ON news_items (created_at DESC);
CREATE INDEX idx_news_dedup ON news_items (dedup_group_id) WHERE dedup_group_id IS NOT NULL;

-- HNSW index for fast vector similarity search (deduplication)
CREATE INDEX idx_news_embedding ON news_items
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RLS policies
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read news
CREATE POLICY "Users can read news"
    ON news_items FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can insert/update (backend worker)
CREATE POLICY "Service role can manage news"
    ON news_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
