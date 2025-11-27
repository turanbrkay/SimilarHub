-- Database initialization script for SimilarHub
-- This script creates the necessary database schema and enables required extensions

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create media_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    poster_path VARCHAR(500),
    year INTEGER,
    overview TEXT,
    genres JSONB,
    source_type VARCHAR(50),
    original_language VARCHAR(10),
    popularity FLOAT,
    embeddings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_items_source_type ON media_items(source_type);
CREATE INDEX IF NOT EXISTS idx_media_items_language ON media_items(original_language);
CREATE INDEX IF NOT EXISTS idx_media_items_popularity ON media_items(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_title ON media_items(title);

--  Create a GIN index on the embeddings JSONB column for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_media_items_embeddings ON media_items USING GIN (embeddings);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO similarhub_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO similarhub_user;
