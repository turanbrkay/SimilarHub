"""
Optimize similarity weights using a golden set of expected matches.
This script tests different weight combinations and finds the one that best ranks expected similar shows.
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
from itertools import product

# Add app root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from vector_db import VectorDB

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Golden Set: Expected similar show pairs (source_title -> expected_similar_title)
GOLDEN_SET = [
    ("Friends", "How I Met Your Mother"),
    ("Friends", "The Big Bang Theory"),
    ("Friends", "Married... with Children"),
    ("Friends", "South Park"),
    ("Friends", "The Office"),
    ("Friends", "Coupling"),
]


def get_show_by_title(vector_db: VectorDB, title: str) -> Dict:
    """Fetch a show's ID and embeddings by title."""
    with vector_db.conn.cursor() as cur:
        cur.execute("""
            SELECT 
                title,
                embedding_analytical,
                embedding_plot,
                keywords_json
            FROM media_items
            WHERE 
                title = %s AND
                embedding_analytical IS NOT NULL AND
                embedding_plot IS NOT NULL
            LIMIT 1
        """, (title,))
        
        row = cur.fetchone()
        if not row:
            return None
            
        return {
            'title': row[0],
            'embeddings': {
                'analytical': np.array(row[1]),
                'plot': np.array(row[2])
            },
            'keywords': row[3]
        }


def calculate_match_score(vector_db: VectorDB, source_show: Dict, expected_similar_title: str, weights: Dict) -> float:
    """
    Calculate how well a weight configuration performs for a single expected match.
    Returns a score between 0 and 1 (higher is better).
    """
    # Ensure weights are plain Python floats (not numpy types)
    clean_weights = {
        'analytical': float(weights['analytical']),
        'plot': float(weights['plot']),
        'keywords': float(weights['keywords'])
    }
    
    # Perform search with given weights
    results = vector_db.search_multi_vector(
        query_vectors=source_show['embeddings'],
        query_keywords=source_show.get('keywords'),
        weights=clean_weights,
        limit=50  # Check top 50
    )
    
    # Find the rank of expected match
    for rank, result in enumerate(results, start=1):
        if result['title'] == expected_similar_title:
            # Use reciprocal rank as score (1/rank)
            # Rank 1 = 1.0, Rank 2 = 0.5, Rank 3 = 0.33, etc.
            return 1.0 / rank
    
    # Not found in top 50
    return 0.0


def evaluate_weights(vector_db: VectorDB, weights: Dict, golden_set: List[Tuple[str, str]]) -> float:
    """
    Evaluate a weight configuration across all golden set pairs.
    Returns average score.
    """
    scores = []
    
    for source_title, expected_title in golden_set:
        source_show = get_show_by_title(vector_db, source_title)
        
        if not source_show:
            logger.warning(f"Source show not found: {source_title}")
            continue
        
        score = calculate_match_score(vector_db, source_show, expected_title, weights)
        scores.append(score)
        logger.debug(f"{source_title} -> {expected_title}: Score = {score:.4f}")
    
    if not scores:
        return 0.0
    
    return np.mean(scores)


def grid_search_weights(vector_db: VectorDB, step: float = 0.05) -> Tuple[Dict, float]:
    """
    Perform grid search to find optimal weights.
    
    Args:
        vector_db: VectorDB instance
        step: Step size for grid search (e.g., 0.05 = 5% increments)
    
    Returns:
        (best_weights, best_score)
    """
    logger.info("Starting grid search for optimal weights...")
    logger.info(f"Step size: {step}")
    
    # Generate all possible weight combinations that sum to 1.0
    best_weights = None
    best_score = -1
    
    # Create range of values from 0 to 1 with given step
    values = np.arange(0, 1 + step, step)
    
    total_combinations = 0
    evaluated = 0
    
    for analytical in values:
        for plot in values:
            for keywords in values:
                # Check if weights sum to approximately 1.0 (with small tolerance for floating point)
                if abs(analytical + plot + keywords - 1.0) < 0.001:
                    total_combinations += 1
    
    logger.info(f"Total valid combinations to test: {total_combinations}")
    
    for analytical in values:
        for plot in values:
            keywords = 1.0 - analytical - plot
            
            # Ensure keywords is valid (non-negative and reasonable)
            if keywords < -0.001 or keywords > 1.001:
                continue
            
            # Round to avoid floating point issues
            keywords = round(keywords, 3)
            analytical = round(analytical, 3)
            plot = round(plot, 3)
            
            weights = {
                'analytical': analytical,
                'plot': plot,
                'keywords': keywords
            }
            
            score = evaluate_weights(vector_db, weights, GOLDEN_SET)
            evaluated += 1
            
            if score > best_score:
                best_score = score
                best_weights = weights
                logger.info(f"New best! Weights: {weights}, Score: {score:.4f}")
            
            if evaluated % 50 == 0:
                logger.info(f"Progress: {evaluated}/{total_combinations} ({evaluated/total_combinations*100:.1f}%)")
    
    return best_weights, best_score


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize similarity weights using golden set")
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='PostgreSQL connection string'
    )
    parser.add_argument(
        '--step',
        type=float,
        default=0.05,
        help='Step size for grid search (default: 0.05 = 5% increments)'
    )
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
    
    vector_db = VectorDB(args.database_url)
    
    # Verify golden set shows exist
    logger.info("Verifying golden set...")
    for source_title, expected_title in GOLDEN_SET:
        source = get_show_by_title(vector_db, source_title)
        if not source:
            logger.warning(f"⚠️  Golden set show not found: {source_title}")
    
    # Run optimization
    best_weights, best_score = grid_search_weights(vector_db, step=args.step)
    
    # Print results
    logger.info("=" * 60)
    logger.info("OPTIMIZATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Best Weights:")
    logger.info(f"  Analytical: {best_weights['analytical']:.2f}")
    logger.info(f"  Plot:       {best_weights['plot']:.2f}")
    logger.info(f"  Keywords:   {best_weights['keywords']:.2f}")
    logger.info(f"Best Score: {best_score:.4f}")
    logger.info("=" * 60)
    
    vector_db.close()


if __name__ == "__main__":
    main()
