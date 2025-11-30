"""
Weighted Jaccard Similarity for Categorized Keywords.

This module provides keyword-based similarity using Weighted Jaccard instead of
embedding-based similarity. Different keyword categories receive different weights
to reflect their importance in determining show similarity.
"""

from typing import Dict, List, Set
import logging

logger = logging.getLogger(__name__)

# Category weights: higher = more important for similarity
CATEGORY_WEIGHTS = {
    'genre_and_tropes': 5.0,      # Most important: crime-drama, supernatural, etc.
    'mood_and_tone': 3.0,          # Very important: dark, witty, dramatic, etc.
    'themes': 2.5,                 # Important: redemption, identity-crisis, etc.
    'plot_and_concepts': 2.0,      # Moderately important: time-travel, soul-currency, etc.
    'character_archetypes': 1.5,   # Somewhat important: anti-hero, detective, etc.
    'narrative_style': 1.5,        # Somewhat important: serialized, procedural, etc.
    'setting': 1.0,                # Less important: modern-los-angeles, etc.
    'target_audience': 1.0,        # Less important: mature-audiences, etc.
    'detail_plot': 0.5             # Least important: too show-specific
}


def weighted_jaccard_similarity(keywords_a: Dict[str, List[str]], 
                                keywords_b: Dict[str, List[str]]) -> float:
    """
    Calculate Weighted Jaccard similarity between two categorized keyword dictionaries.
    
    Args:
        keywords_a: Dictionary of categories -> list of keywords for show A
        keywords_b: Dictionary of categories -> list of keywords for show B
    
    Returns:
        Weighted Jaccard similarity score between 0.0 and 1.0
        Higher score = more similar
    
    Example:
        keywords_a = {
            'genre_and_tropes': ['crime-drama', 'supernatural'],
            'mood_and_tone': ['dark', 'witty']
        }
        keywords_b = {
            'genre_and_tropes': ['crime-drama', 'procedural'],
            'mood_and_tone': ['dark', 'mysterious']
        }
        
        score = weighted_jaccard_similarity(keywords_a, keywords_b)
        # Returns ~0.55 (high genre overlap, moderate mood overlap)
    """
    if not keywords_a or not keywords_b:
        return 0.0
    
    weighted_intersection = 0.0
    weighted_union = 0.0
    
    # Get all categories from both shows
    all_categories = set(keywords_a.keys()) | set(keywords_b.keys())
    
    for category in all_categories:
        # Get weight for this category (default to 1.0 if unknown)
        weight = CATEGORY_WEIGHTS.get(category, 1.0)
        
        # Convert keyword lists to sets for set operations
        set_a = set(keywords_a.get(category, []))
        set_b = set(keywords_b.get(category, []))
        
        # Calculate intersection and union
        intersection = set_a & set_b
        union = set_a | set_b
        
        # Add weighted counts
        weighted_intersection += len(intersection) * weight
        weighted_union += len(union) * weight
    
    # Return Jaccard coefficient
    if weighted_union == 0:
        return 0.0
    
    return weighted_intersection / weighted_union


def get_similarity_details(keywords_a: Dict[str, List[str]], 
                          keywords_b: Dict[str, List[str]]) -> Dict[str, any]:
    """
    Get detailed breakdown of similarity by category.
    
    Useful for debugging and understanding why two shows are similar.
    
    Returns:
        Dictionary with:
        - overall_score: float
        - category_scores: dict of category -> {intersection, union, score, weight}
        - common_keywords: dict of category -> list of common keywords
    """
    details = {
        'overall_score': 0.0,
        'category_scores': {},
        'common_keywords': {}
    }
    
    if not keywords_a or not keywords_b:
        return details
    
    weighted_intersection = 0.0
    weighted_union = 0.0
    all_categories = set(keywords_a.keys()) | set(keywords_b.keys())
    
    for category in all_categories:
        weight = CATEGORY_WEIGHTS.get(category, 1.0)
        set_a = set(keywords_a.get(category, []))
        set_b = set(keywords_b.get(category, []))
        
        intersection = set_a & set_b
        union = set_a | set_b
        
        category_score = len(intersection) / len(union) if len(union) > 0 else 0.0
        
        details['category_scores'][category] = {
            'intersection': len(intersection),
            'union': len(union),
            'score': category_score,
            'weight': weight
        }
        
        details['common_keywords'][category] = sorted(list(intersection))
        
        weighted_intersection += len(intersection) * weight
        weighted_union += len(union) * weight
    
    details['overall_score'] = weighted_intersection / weighted_union if weighted_union > 0 else 0.0
    
    return details


def normalize_keywords(keywords: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """
    Normalize keywords for consistent comparison.
    
    - Convert to lowercase
    - Remove duplicates
    - Sort for consistency
    
    Args:
        keywords: Raw keyword dictionary (or potentially malformed data)
    
    Returns:
        Normalized keyword dictionary
    """
    normalized = {}
    
    # Handle case where keywords is not a dict (some LLM responses are malformed)
    if not isinstance(keywords, dict):
        logger.warning(f"Invalid keyword format: expected dict, got {type(keywords)}")
        return {}
   
    
    for category, keyword_list in keywords.items():
        if not isinstance(keyword_list, list):
            logger.warning(f"Invalid keyword format for category {category}: {type(keyword_list)}")
            continue
        
        # Lowercase, deduplicate, sort
        normalized_list = sorted(list(set(kw.lower().strip() for kw in keyword_list if kw and isinstance(kw, str))))
        if normalized_list:
            normalized[category] = normalized_list
    
    return normalized
