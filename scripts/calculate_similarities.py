"""
Calculate and store similarities between TV shows.
This script performs a weighted vector search for each show and stores the results.
"""

import os
import logging
import sys
import time
from pathlib import Path
from typing import List, Dict
import numpy as np

# Add app root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from vector_db import VectorDB, WEIGHT_PROFILES

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_all_shows_with_embeddings(vector_db: VectorDB) -> List[Dict]:
    """Fetch all shows that have valid embeddings."""
    with vector_db.conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id, 
                title,
                embedding_analytical,
                embedding_plot,
                keywords_json
            FROM media_items 
            WHERE 
                embedding_analytical IS NOT NULL AND
                embedding_plot IS NOT NULL
            ORDER BY id
        """)
        
        shows = []
        for row in cur.fetchall():
            shows.append({
                'id': row[0],
                'title': row[1],
                'embeddings': {
                    'analytical': np.array(row[2]),
                    'plot': np.array(row[3])
                },
                'keywords_json': row[4]
            })
        
        return shows

def calculate_similarities(
    database_url: str,
    top_k: int = 50,
    batch_size: int = 50
):
    """
    Main function to calculate and store similarities.
    """
    logger.info("Starting similarity calculation...")
    
    vector_db = VectorDB(database_url)
    
    # 1. Fetch all shows
    logger.info("Fetching shows with embeddings...")
    shows = get_all_shows_with_embeddings(vector_db)
    total_shows = len(shows)
    logger.info(f"Found {total_shows} shows with complete embeddings")
    
    if total_shows == 0:
        logger.warning("No shows found. Exiting.")
        return

    # 2. Process each show
    start_time = time.time()
    processed = 0
    
    for i, source_show in enumerate(shows):
        try:
            # Perform vector search for this show
            # We exclude the show itself in the query logic usually, but let's handle it explicitly if needed
            # The search_multi_vector method returns top K matches
            
            # 2. Calculate similarities
            results = vector_db.search_multi_vector(
                query_vectors=source_show['embeddings'],
                query_keywords=source_show.get('keywords_json'),
                weights=WEIGHT_PROFILES['user_custom'], # Assuming 'user_custom' is the intended weight profile
                limit=top_k + 1  # +1 to exclude itself
            )
            
            # Filter out self
            similar_shows = [r for r in results if r['id'] != source_show['id']]
            similar_shows = similar_shows[:top_k]
            
            # Store results
            vector_db.save_similarities(source_show['id'], similar_shows)
            
            processed += 1
            
            if processed % batch_size == 0:
                elapsed = time.time() - start_time
                rate = processed / elapsed
                remaining = (total_shows - processed) / rate
                logger.info(f"Processed {processed}/{total_shows} ({processed/total_shows*100:.1f}%) - ETA: {remaining/60:.1f} min")
                
        except Exception as e:
            logger.error(f"Error processing show {source_show['id']} ({source_show['title']}): {e}")
            vector_db.conn.rollback()
            continue

    total_time = time.time() - start_time
    logger.info("=" * 60)
    logger.info("CALCULATION COMPLETE")
    logger.info(f"Processed {processed} shows in {total_time/60:.1f} minutes")
    logger.info("=" * 60)
    
    vector_db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Calculate similarities for TV shows")
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='PostgreSQL connection string'
    )
    parser.add_argument(
        '--top-k',
        type=int,
        default=20,
        help='Number of similar items to store per show'
    )
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
        
    calculate_similarities(
        database_url=args.database_url,
        top_k=args.top_k
    )
