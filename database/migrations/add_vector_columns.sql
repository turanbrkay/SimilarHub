-- Add vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to media_items table
-- BGE-M3 uses 1024-dimensional vectors

ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS embedding_analytical vector(1024);

ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS embedding_plot vector(1024);

ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS embedding_keywords vector(1024);

-- Create HNSW indexes for fast similarity search
-- HNSW (Hierarchical Navigable Small World) is optimal for high-dimensional vectors
-- vector_cosine_ops uses cosine distance metric

CREATE INDEX IF NOT EXISTS idx_embedding_analytical_hnsw 
ON media_items 
USING hnsw(embedding_analytical vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embedding_plot_hnsw 
ON media_items 
USING hnsw(embedding_plot vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embedding_keywords_hnsw 
ON media_items 
USING hnsw(embedding_keywords vector_cosine_ops);

-- Add index for shows with all embeddings (for filtering)
CREATE INDEX IF NOT EXISTS idx_has_all_embeddings 
ON media_items (id) 
WHERE embedding_analytical IS NOT NULL 
  AND embedding_plot IS NOT NULL 
  AND embedding_keywords IS NOT NULL;
