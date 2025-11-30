"""
Process and generate embeddings for all TV shows in results directory.
Reads JSON files, extracts LLM outputs, generates BGE-M3 embeddings, and stores in PostgreSQL.
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict
import sys

# Add app root to path (where embedding_service.py is located in Docker)
sys.path.insert(0, str(Path(__file__).parent.parent))

from embedding_service import EmbeddingService
from vector_db import VectorDB
import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_show_data_from_results(results_dir: str) -> List[Dict]:
    """
    Load TV show data from results JSON files.
    
    Args:
        results_dir: Path to results directory
        
    Returns:
        List of dicts with show metadata and LLM outputs
    """
    results_path = Path(results_dir)
    show_data = []
    
    logger.info(f"Loading JSON files from {results_path}")
    
    for json_file in sorted(results_path.glob("*.json")):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract relevant data
            input_data = data.get('input_data', {})
            llm_outputs = data.get('llm_outputs', {})
            
            # Get first LLM provider's response (ollama, gemma, etc.)
            llm_response = None
            for provider in llm_outputs.values():
                if 'response' in provider:
                    llm_response = provider['response']
                    break
            
            if not llm_response:
                logger.warning(f"No LLM response found in {json_file.name}")
                continue
            
            show_data.append({
                'title': input_data.get('title'),
                'overview': input_data.get('overview'),
                'genres': input_data.get('genres', []),
                'release_year': input_data.get('release_year'),
                'llm_response': llm_response,
                'source_file': json_file.name
            })
        
        except Exception as e:
            logger.error(f"Error loading {json_file.name}: {e}")
    
    logger.info(f"Loaded {len(show_data)} shows from JSON files")
    return show_data


def get_or_create_shows_in_db(conn, show_data: List[Dict]) -> Dict[str, int]:
    """
    Ensure all shows exist in database and return title -> id mapping.
    
    Args:
        conn: Database connection
        show_data: List of show dicts
        
    Returns:
        Dict mapping show title to database ID
    """
    title_to_id = {}
    
    with conn.cursor() as cur:
        for show in show_data:
            title = show['title']
            
            # Check if show exists
            cur.execute(
                "SELECT id FROM media_items WHERE title = %s AND source_type = 'tv'",
                (title,)
            )
            row = cur.fetchone()
            
            if row:
                title_to_id[title] = row[0]
            else:
                # Insert new show
                # Note: genres is stored as JSONB in media_items usually, or text array.
                # Assuming JSONB based on app.py usage: jsonb_array_elements_text
                cur.execute("""
                    INSERT INTO media_items (title, overview, genres, year, source_type)
                    VALUES (%s, %s, %s, %s, 'tv')
                    RETURNING id
                """, (
                    title,
                    show['overview'],
                    json.dumps(show['genres']),
                    show['release_year']
                ))
                title_to_id[title] = cur.fetchone()[0]
    
    conn.commit()
    logger.info(f"Ensured {len(title_to_id)} shows in database")
    return title_to_id


def process_embeddings(
    results_dir: str,
    database_url: str,
    batch_size: int = 32,
    limit: int = None
):
    """
    Main processing function: load data, generate embeddings, store in DB.
    
    Args:
        results_dir: Path to results directory
        database_url: PostgreSQL connection string
        batch_size: Number of shows to process at once
        limit: Maximum number of shows to process (optional)
    """
    logger.info("Starting embedding processing pipeline")
    
    # Initialize services
    logger.info("Loading BGE-M3 model...")
    embedding_service = EmbeddingService()
    
    logger.info("Connecting to database...")
    vector_db = VectorDB(database_url)
    
    # Ensure schema is ready
    logger.info("Ensuring vector columns and indexes...")
    vector_db.ensure_vector_columns()
    vector_db.create_vector_indexes()
    
    # Load show data from JSON files
    show_data = load_show_data_from_results(results_dir)
    
    if not show_data:
        logger.error("No show data loaded. Exiting.")
        return
        
    # Apply limit if specified
    if limit:
        logger.info(f"Limiting processing to first {limit} shows")
        show_data = show_data[:limit]
    
    # Get database IDs
    title_to_id = get_or_create_shows_in_db(vector_db.conn, show_data)
    
    # Process in batches
    total = len(show_data)
    processed = 0
    
    for i in range(0, total, batch_size):
        batch = show_data[i:i+batch_size]
        batch_titles = [s['title'] for s in batch]
        
        logger.info(f"Processing batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({len(batch)} shows)")
        
        # Generate embeddings for batch
        llm_responses = [s['llm_response'] for s in batch]
        embeddings_batch = embedding_service.embed_shows_batch(llm_responses)
        
        # Prepare data for database insert
        db_data = [
            (title_to_id[title], embeddings)
            for title, embeddings in zip(batch_titles, embeddings_batch)
        ]
        
        # Batch insert to database
        vector_db.insert_embeddings_batch(db_data)
        
        processed += len(batch)
        logger.info(f"Progress: {processed}/{total} ({processed/total*100:.1f}%)")
    
    # Print statistics
    stats = vector_db.get_embedding_stats()
    logger.info("=" * 60)
    logger.info("PROCESSING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Total shows in database: {stats['total_shows']}")
    logger.info(f"Shows with all vectors: {stats['with_all_vectors']}")
    logger.info(f"Completion rate: {stats['completion_rate']:.1f}%")
    logger.info("=" * 60)
    
    # Cleanup
    vector_db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate embeddings for TV shows")
    parser.add_argument(
        '--results-dir',
        default='/app/results',
        help='Directory containing JSON result files'
    )
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='PostgreSQL connection string'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size for processing'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Limit number of shows to process'
    )
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
    
    process_embeddings(
        results_dir=args.results_dir,
        database_url=args.database_url,
        batch_size=args.batch_size,
        limit=args.limit
    )
