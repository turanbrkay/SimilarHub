-- Add keywords_json column to store categorized keywords
-- This allows us to use Weighted Jaccard similarity instead of embeddings

ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS keywords_json JSONB;

-- Create GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_keywords_json ON media_items USING GIN (keywords_json);

-- Add comment for documentation
COMMENT ON COLUMN media_items.keywords_json IS 'Categorized keywords from LLM response for Weighted Jaccard similarity';
