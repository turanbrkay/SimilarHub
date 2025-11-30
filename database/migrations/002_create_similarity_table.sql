-- Create table for storing pre-calculated similarities
CREATE TABLE IF NOT EXISTS similar_items (
    source_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE,
    target_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    similarity_details JSONB, -- Stores breakdown like {"analytical": 0.8, "plot": 0.5, "keywords": 0.9}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_id, target_id)
);

-- Index for fast retrieval of similar items for a show
CREATE INDEX IF NOT EXISTS idx_similar_items_source_score ON similar_items(source_id, score DESC);
