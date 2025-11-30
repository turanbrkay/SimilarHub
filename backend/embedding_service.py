"""
BGE-M3 Embedding Service
Handles multi-vector embedding generation for TV shows
"""

import os
import logging
from typing import Dict, List, Tuple
import numpy as np
from FlagEmbedding import BGEM3FlagModel

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    BGE-M3 based embedding service for multi-vector TV show representation.
    Generates separate embeddings for analytical_summary, plot_summary, and keywords.
    """
    
    def __init__(self, model_name: str = "BAAI/bge-m3", cache_dir: str = "/app/models"):
        """
        Initialize BGE-M3 model.
        
        Args:
            model_name: HuggingFace model identifier
            cache_dir: Directory to cache downloaded models
        """
        logger.info(f"Loading BGE-M3 model: {model_name}")
        self.model = BGEM3FlagModel(
            model_name,
            use_fp16=True,  # Use FP16 for faster inference
            device='cpu'     # Change to 'cuda' if GPU available
        )
        logger.info("BGE-M3 model loaded successfully")
        
    def encode_single(self, text: str, normalize: bool = True) -> np.ndarray:
        """
        Encode a single text to embedding vector.
        
        Args:
            text: Input text
            normalize: Whether to L2-normalize the embedding
            
        Returns:
            1024-dimensional embedding vector
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return np.zeros(1024)
        
        # BGE-M3 encode - returns dict with 'dense_vecs'
        result = self.model.encode(
            [text],
            batch_size=1,
            max_length=8192  # BGE-M3 supports up to 8192 tokens
        )
        
        embedding = result['dense_vecs'][0]
        
        if normalize:
            # L2 normalization for cosine similarity
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
        
        return embedding
    
    def encode_batch(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """
        Encode multiple texts in batch (more efficient).
        
        Args:
            texts: List of input texts
            normalize: Whether to L2-normalize embeddings
            
        Returns:
            Array of embeddings, shape (N, 1024)
        """
        if not texts:
            return np.array([])
        
        # Handle empty texts
        processed_texts = [t if t and t.strip() else " " for t in texts]
        
        # Batch encode
        result = self.model.encode(
            processed_texts,
            batch_size=32,
            max_length=8192
        )
        
        embeddings = result['dense_vecs']
        
        if normalize:
            # L2 normalize each embedding
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms = np.where(norms > 0, norms, 1)  # Avoid division by zero
            embeddings = embeddings / norms
        
        return embeddings
    
    def keywords_to_text(self, categorized_keywords: Dict) -> str:
        """
        Convert structured keywords to weighted text representation.
        Important categories are repeated for higher weight.
        
        Args:
            categorized_keywords: Dict with keyword categories
            
        Returns:
            Space-separated text representation
        """
        parts = []
        
        # High-weight categories (repeat 2x)
        high_weight_cats = ['themes', 'mood_and_tone', 'genre_and_tropes']
        for cat in high_weight_cats:
            if cat in categorized_keywords and categorized_keywords[cat]:
                keywords = ' '.join(categorized_keywords[cat])
                parts.append(keywords)
                parts.append(keywords)  # Repeat for emphasis
        
        # Medium-weight categories (1x)
        medium_weight_cats = ['setting', 'character_archetypes', 'narrative_style', 'plot_and_concepts']
        for cat in medium_weight_cats:
            if cat in categorized_keywords and categorized_keywords[cat]:
                keywords = ' '.join(categorized_keywords[cat])
                parts.append(keywords)
        
        return ' '.join(parts)
    
    def embed_show(self, llm_response: Dict) -> Dict[str, np.ndarray]:
        """
        Generate multi-vector embeddings for a single TV show.
        
        Args:
            llm_response: Dict containing analytical_summary, spoiler_rich_plot_summary, 
                         and categorized_keywords
        
        Returns:
            Dict with 'analytical', 'plot', 'keywords' embedding vectors
        """
        # Extract fields
        analytical_text = llm_response.get('analytical_summary', '')
        plot_text = llm_response.get('spoiler_rich_plot_summary', '')
        keywords_dict = llm_response.get('categorized_keywords', {})
        
        # Convert keywords to text
        keywords_text = self.keywords_to_text(keywords_dict)
        
        # Generate embeddings
        v_analytical = self.encode_single(analytical_text)
        v_plot = self.encode_single(plot_text)
        v_keywords = self.encode_single(keywords_text)
        
        return {
            'analytical': v_analytical,
            'plot': v_plot,
            'keywords': v_keywords
        }
    
    def embed_shows_batch(self, llm_responses: List[Dict]) -> List[Dict[str, np.ndarray]]:
        """
        Generate embeddings for multiple shows in batch (much faster).
        
        Args:
            llm_responses: List of LLM response dicts
            
        Returns:
            List of embedding dicts, one per show
        """
        # Extract all texts
        analytical_texts = []
        plot_texts = []
        keywords_texts = []
        
        for resp in llm_responses:
            analytical_texts.append(resp.get('analytical_summary', ''))
            plot_texts.append(resp.get('spoiler_rich_plot_summary', ''))
            keywords_dict = resp.get('categorized_keywords', {})
            keywords_texts.append(self.keywords_to_text(keywords_dict))
        
        # Batch encode all at once
        analytical_embeds = self.encode_batch(analytical_texts)
        plot_embeds = self.encode_batch(plot_texts)
        keywords_embeds = self.encode_batch(keywords_texts)
        
        # Package results
        results = []
        for i in range(len(llm_responses)):
            results.append({
                'analytical': analytical_embeds[i],
                'plot': plot_embeds[i],
                'keywords': keywords_embeds[i]
            })
        
        return results


# Global singleton instance
_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    """Get or create global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
