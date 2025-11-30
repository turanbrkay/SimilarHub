"""
Find similar shows for a given TV show on-demand.
"""

import os
import sys
import logging
from pathlib import Path

# Add app root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from vector_db import VectorDB, WEIGHT_PROFILES

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_similar_shows(show_title: str, database_url: str, limit: int = 20):
    """
    Find similar shows for a given show title.
    
    Args:
        show_title: Title of the show to search for
        database_url: Database connection URL
        limit: Number of similar shows to return
    """
    vector_db = VectorDB(database_url)
    
    # Fetch the show and its embeddings + keywords
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
                LOWER(title) = LOWER(%s) AND
                embedding_analytical IS NOT NULL AND
                embedding_plot IS NOT NULL
            LIMIT 1
        """, (show_title,))
        
        row = cur.fetchone()
        
        if not row:
            logger.error(f"Show not found or embeddings not available: {show_title}")
            vector_db.close()
            return
        
        source_show = {
            'id': row[0],
            'title': row[1],
            'embeddings': {
                'analytical': row[2],
                'plot': row[3]
            },
            'keywords': row[4] if row[4] else None
        }
    
    logger.info(f"Found show: {source_show['title']} (ID: {source_show['id']})")
    logger.info(f"Searching for {limit} similar shows using weight profile: user_custom")
    logger.info(f"Weights: {WEIGHT_PROFILES['user_custom']}")
    
    # Search for similar shows using hybrid approach
    results = vector_db.search_multi_vector(
        query_vectors=source_show['embeddings'],
        query_keywords=source_show['keywords'],
        weights=WEIGHT_PROFILES['user_custom'],
        limit=limit + 1  # +1 to exclude itself
    )
    
    # Filter out the source show itself
    similar_shows = [r for r in results if r['id'] != source_show['id']][:limit]
    
    # Display results
    print("\n" + "="*80)
    print(f"SIMILAR SHOWS TO: {source_show['title']}")
    print("="*80)
    
    for i, show in enumerate(similar_shows, 1):
        print(f"\n{i}. {show['title']}")
        print(f"   Score: {show['final_score']:.4f}")
        print(f"   Genres: {show['genres']}")
        print(f"   Detail Scores:")
        print(f"     - Analytical: {show['similarity_scores']['analytical']:.4f}")
        print(f"     - Plot:       {show['similarity_scores']['plot']:.4f}")
        print(f"     - Keywords:   {show['similarity_scores']['keywords']:.4f}")
        if show['overview']:
            overview = show['overview'][:100] + "..." if len(show['overview']) > 100 else show['overview']
            print(f"   Overview: {overview}")
    
    print("\n" + "="*80)
    
    vector_db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Find similar TV shows")
    parser.add_argument(
        'show_title',
        type=str,
        help='Title of the TV show'
    )
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='PostgreSQL connection string'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=20,
        help='Number of similar shows to return (default: 20)'
    )
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
    
    find_similar_shows(args.show_title, args.database_url, args.limit)
