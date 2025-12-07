"""
Update keywords ONLY for shows that don't have keywords_json yet.
Does not regenerate embeddings.
"""

import os
import json
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from vector_db import VectorDB

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_show_data_from_results(results_dir: str):
    """Load show data from JSON files."""
    results_path = Path(results_dir)
    show_data = []
    
    logger.info(f"Loading JSON files from {results_path}")
    
    for json_file in sorted(results_path.glob("*.json")):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            input_data = data.get('input_data', {})
            llm_outputs = data.get('llm_outputs', {})
            
            # Get first LLM provider's response
            llm_response = None
            for provider in llm_outputs.values():
                if 'response' in provider:
                    llm_response = provider['response']
                    break
            
            if not llm_response:
                continue
            
            show_data.append({
                'title': input_data.get('title'),
                'llm_response': llm_response
            })
        
        except Exception as e:
            logger.error(f"Error loading {json_file.name}: {e}")
    
    logger.info(f"Loaded {len(show_data)} shows from JSON files")
    return show_data


def update_keywords_only(results_dir: str, database_url: str):
    """
    Update keywords for shows that don't have keywords_json.
    Does not regenerate embeddings.
    """
    logger.info("Starting keywords-only update...")
    
    vector_db = VectorDB(database_url)
    
    # Load show data from JSON
    show_data = load_show_data_from_results(results_dir)
    
    if not show_data:
        logger.error("No show data loaded. Exiting.")
        return
    
    # Get shows that don't have keywords
    with vector_db.conn.cursor() as cur:
        cur.execute("""
            SELECT id, title 
            FROM media_items 
            WHERE keywords_json IS NULL
        """)
        
        shows_without_keywords = {row[1]: row[0] for row in cur.fetchall()}
    
    logger.info(f"Found {len(shows_without_keywords)} shows without keywords")
    
    if not shows_without_keywords:
        logger.info("All shows already have keywords!")
        return
    
    # Process keywords
    keywords_data = []
    found_count = 0
    
    for show in show_data:
        title = show['title']
        
        # Skip if this show already has keywords
        if title not in shows_without_keywords:
            continue
        
        show_id = shows_without_keywords[title]
        llm_response = show['llm_response']
        
        # Extract keywords
        keywords = None
        
        # Method 1: New format - categorized_keywords field
        if 'categorized_keywords' in llm_response:
            keywords = llm_response['categorized_keywords']
            found_count += 1
        
        # Method 2: Old format - direct fields
        elif any(key in llm_response for key in [
            'genre_and_tropes', 'mood_and_tone', 'themes', 
            'plot_and_concepts', 'character_archetypes', 
            'narrative_style', 'setting', 'target_audience', 'detail_plot'
        ]):
            # Reconstruct categorized_keywords from direct fields
            keywords = {}
            for category in [
                'genre_and_tropes', 'mood_and_tone', 'themes',
                'plot_and_concepts', 'character_archetypes',
                'narrative_style', 'setting', 'target_audience', 'detail_plot'
            ]:
                if category in llm_response:
                    keywords[category] = llm_response[category]
            found_count += 1
        
        if keywords:
            keywords_data.append((show_id, keywords))
            logger.info(f"Found keywords for: {title}")
    
    # Batch insert keywords
    if keywords_data:
        logger.info(f"Inserting keywords for {len(keywords_data)} shows...")
        vector_db.insert_keywords_batch(keywords_data)
        logger.info("Keywords inserted successfully!")
    else:
        logger.warning("No keywords found to insert")
    
    # Print final stats
    with vector_db.conn.cursor() as cur:
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(keywords_json) as with_keywords
            FROM media_items
        """)
        row = cur.fetchone()
        logger.info("=" * 60)
        logger.info("UPDATE COMPLETE")
        logger.info(f"Total shows: {row[0]}")
        logger.info(f"Shows with keywords: {row[1]}")
        logger.info(f"Coverage: {row[1]/row[0]*100:.1f}%")
        logger.info("=" * 60)
    
    vector_db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Update keywords only for shows without them")
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
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
    
    update_keywords_only(
        results_dir=args.results_dir,
        database_url=args.database_url
    )
