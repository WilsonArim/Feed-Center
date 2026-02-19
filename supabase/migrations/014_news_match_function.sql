-- pgvector similarity search function for news deduplication
-- Called by the worker to find duplicate news items

CREATE OR REPLACE FUNCTION match_news_embedding(
    query_embedding TEXT,
    similarity_threshold FLOAT DEFAULT 0.90,
    match_count INT DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    similarity FLOAT,
    dedup_group_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        1 - (n.embedding <=> query_embedding::vector) AS similarity,
        n.dedup_group_id
    FROM news_items n
    WHERE n.embedding IS NOT NULL
      AND 1 - (n.embedding <=> query_embedding::vector) > similarity_threshold
    ORDER BY n.embedding <=> query_embedding::vector
    LIMIT match_count;
END;
$$;
