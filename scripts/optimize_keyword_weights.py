"""
Optimize keyword category weights using golden set.
Uses greedy sequential optimization: optimize one category at a time.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np

# Add app root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from vector_db import VectorDB
from keyword_similarity import CATEGORY_WEIGHTS
from golden_set import GOLDEN_SET

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Weight profiles to use for vector embeddings
VECTOR_WEIGHTS = {
    'analytical': 0.35,
    'plot': 0.25,
    'keywords': 0.40
}


def get_show_by_title(vector_db: VectorDB, title: str) -> Dict:
    """Fetch a show's data by title."""
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


def calculate_match_score(
    vector_db: VectorDB, 
    source_show: Dict, 
    expected_similar_title: str,
    keyword_weights: Dict[str, float]
) -> float:
    """
    Calculate how well keyword weights perform for a single expected match.
    Returns reciprocal rank score (0-1).
    """
    # Import here to allow dynamic modification
    import keyword_similarity
    
    # Temporarily update keyword weights
    original_weights = keyword_similarity.CATEGORY_WEIGHTS.copy()
    keyword_similarity.CATEGORY_WEIGHTS = keyword_weights
    
    try:
        # Perform search
        results = vector_db.search_multi_vector(
            query_vectors=source_show['embeddings'],
            query_keywords=source_show.get('keywords'),
            weights=VECTOR_WEIGHTS,
            limit=50
        )
        
        # Find rank of expected match
        for rank, result in enumerate(results, start=1):
            if result['title'] == expected_similar_title:
                return 1.0 / rank
        
        return 0.0
        
    finally:
        # Restore original weights
        keyword_similarity.CATEGORY_WEIGHTS = original_weights


def evaluate_keyword_weights(
    vector_db: VectorDB,
    keyword_weights: Dict[str, float],
    golden_set: List[Tuple[str, str]]
) -> float:
    """
    Evaluate keyword category weights across all golden set pairs.
    Returns average reciprocal rank score.
    """
    scores = []
    
    for source_title, expected_title in golden_set:
        source_show = get_show_by_title(vector_db, source_title)
        
        if not source_show:
            logger.warning(f"Source show not found: {source_title}")
            continue
        
        score = calculate_match_score(vector_db, source_show, expected_title, keyword_weights)
        scores.append(score)
    
    if not scores:
        return 0.0
    
    return np.mean(scores)


def optimize_category_sequential(
    vector_db: VectorDB,
    min_weight: float = 0.1,
    max_weight: float = 10.0,
    step: float = 0.5
) -> Tuple[Dict[str, float], float]:
    """
    Optimize each category weight sequentially (greedy approach).
    Much faster than full grid search.
    """
    logger.info("Starting sequential keyword category weight optimization...")
    logger.info(f"Weight range: {min_weight} to {max_weight}, step: {step}")
    
    # Start with current weights
    best_weights = CATEGORY_WEIGHTS.copy()
    best_score = evaluate_keyword_weights(vector_db, best_weights, GOLDEN_SET)
    
    logger.info(f"Initial score with current weights: {best_score:.4f}")
    
    # Optimize each category one by one
    categories = list(CATEGORY_WEIGHTS.keys())
    
    for category in categories:
        logger.info(f"\n{'='*60}")
        logger.info(f"Optimizing category: {category}")
        logger.info(f"Current weight: {best_weights[category]:.2f}")
        
        category_best_weight = best_weights[category]
        category_best_score = best_score
        
        # Try different weights for this category
        test_values = np.arange(min_weight, max_weight + step, step)
        
        for weight in test_values:
            # Create test weights with only this category changed
            test_weights = best_weights.copy()
            test_weights[category] = weight
            
            score = evaluate_keyword_weights(vector_db, test_weights, GOLDEN_SET)
            
            if score > category_best_score:
                category_best_score = score
                category_best_weight = weight
                logger.info(f"  New best for {category}: {weight:.2f} → Score: {score:.4f}")
        
        # Update best weights if improved
        if category_best_score > best_score:
            best_weights[category] = category_best_weight
            best_score = category_best_score
            logger.info(f"✓ Updated {category}: {category_best_weight:.2f}")
        else:
            logger.info(f"✗ No improvement for {category}, keeping {best_weights[category]:.2f}")
    
    return best_weights, best_score


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize keyword category weights")
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='PostgreSQL connection string'
    )
    parser.add_argument(
        '--min',
        type=float,
        default=0.1,
        help='Minimum weight value (default: 0.1)'
    )
    parser.add_argument(
        '--max',
        type=float,
        default=10.0,
        help='Maximum weight value (default: 10.0)'
    )
    parser.add_argument(
        '--step',
        type=float,
        default=0.5,
        help='Step size for weight search (default: 0.5)'
    )
    
    args = parser.parse_args()
    
    if not args.database_url:
        logger.error("DATABASE_URL not provided")
        sys.exit(1)
    
    vector_db = VectorDB(args.database_url)
    
    # Verify golden set
    logger.info("Verifying golden set...")
    for source_title, _ in GOLDEN_SET:
        source = get_show_by_title(vector_db, source_title)
        if not source:
            logger.warning(f"⚠️  Golden set show not found: {source_title}")
    
    # Run optimization
    best_weights, best_score = optimize_category_sequential(
        vector_db,
        min_weight=args.min,
        max_weight=args.max,
        step=args.step
    )
    
    # Print results
    logger.info("\n" + "="*60)
    logger.info("OPTIMIZATION COMPLETE")
    logger.info("="*60)
    logger.info("Best Keyword Category Weights:")
    for category, weight in sorted(best_weights.items(), key=lambda x: x[1], reverse=True):
        logger.info(f"  {category:25s}: {weight:.2f}")
    logger.info(f"\nBest Score: {best_score:.4f}")
    logger.info("="*60)
    
    # Print Python code to copy-paste
    logger.info("\nCopy this to backend/keyword_similarity.py:")
    logger.info("CATEGORY_WEIGHTS = {")
    for category, weight in best_weights.items():
        logger.info(f"    '{category}': {weight:.1f},")
    logger.info("}")
    
    vector_db.close()


if __name__ == "__main__":
    main()
