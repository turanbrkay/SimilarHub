"""
Semantic search endpoints for BGE-M3 multi-vector search.
Imported by app.py
"""

from flask import request, jsonify
from embedding_service import get_embedding_service
from vector_db import VectorDB, WEIGHT_PROFILES
import logging
import os
import numpy as np

# Setup logger
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

# Pre-load resources if needed (BM25 is loaded in app.py, we might need to access it differently or pass it)
# For now, we'll assume BM25_MODEL and BM25_IDS are available globally in app context or we re-load/access them.
# To keep it clean, we will access global variables from app.py if possible, or better, pass them.
# But for this refactor, let's just use the functions.

# Note: BM25 integration in hybrid_search needs access to the model. 
# We'll import it inside the function to avoid top-level circular imports if possible, 
# or rely on it being available.

def semantic_search():
    """
    Semantic search using BGE-M3 multi-vector embeddings.
    
    Request body:
    {
        "query": "dark psychological thriller with complex characters",
        "intent": "theme_mood",  // optional: mixed|theme_mood|plot_based|keyword_based
        "limit": 10,  // optional, default 10
        "min_score": 0.5  // optional, default 0.5
    }
    """
    data = request.json
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    intent = data.get('intent', 'mixed')
    limit = data.get('limit', 10)
    min_score = data.get('min_score', 0.5)
    
    # Validate intent
    if intent not in WEIGHT_PROFILES:
        intent = 'mixed'
    
    try:
        # Get embedding service
        emb_service = get_embedding_service()
        
        # Encode query - simple approach: same text for all three vectors
        # Could be improved with LLM-based query transformation
        query_vectors = {
            'analytical': emb_service.encode_single(query),
           'plot': emb_service.encode_single(query),
            'keywords': emb_service.encode_single(query)
        }
        
        # Get vector database
        vector_db = VectorDB(DATABASE_URL)
        
        # Search with selected weight profile
        weights = WEIGHT_PROFILES[intent]
        results = vector_db.search_multi_vector(
            query_vectors=query_vectors,
            weights=weights,
            limit=limit,
            min_score=min_score
        )
        
        vector_db.close()
        
        return jsonify({
            "query": query,
            "intent": intent,
            "weights": weights,
            "results": results
        })
    
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/search/hybrid', methods=['POST'])
def hybrid_search():
    """
    Hybrid search combining semantic (vector) and keyword (BM25) search.
    
    Request body:
    {
        "query": "show like Breaking Bad",
        "intent": "mixed",
        "limit": 10,
        "semantic_weight": 0.7,  // optional, default 0.7
        "keyword_weight": 0.3    // optional, default 0.3
    }
    """
    data = request.json
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    intent = data.get('intent', 'mixed')
    limit = data.get('limit', 10)
    semantic_weight = data.get('semantic_weight', 0.7)
    keyword_weight = data.get('keyword_weight', 0.3)
    
    try:
        # 1. Semantic search
        emb_service = get_embedding_service()
        query_vectors = {
            'analytical': emb_service.encode_single(query),
            'plot': emb_service.encode_single(query),
            'keywords': emb_service.encode_single(query)
        }
        
        vector_db = VectorDB(DATABASE_URL)
        weights = WEIGHT_PROFILES.get(intent, WEIGHT_PROFILES['mixed'])
        
        semantic_results = vector_db.search_multi_vector(
            query_vectors=query_vectors,
            weights=weights,
            limit=50,  # Get more for fusion
            min_score=0.0
        )
        vector_db.close()
        
        # 2. Keyword search (BM25)
        keyword_scores = {}
        
        # Access BM25 model from app module (circular import inside function is usually fine in Python)
        try:
            import app as main_app
            bm25_model = getattr(main_app, 'BM25_MODEL', None)
            bm25_ids = getattr(main_app, 'BM25_IDS', None)
            preprocess_text = getattr(main_app, 'preprocess_text', None)
        except ImportError:
            bm25_model = None
            
        if bm25_model and preprocess_text:
            tokenized_query = preprocess_text(query)
            doc_scores = bm25_model.get_scores(tokenized_query)
            max_score = np.max(doc_scores) if len(doc_scores) > 0 else 1.0
            if max_score > 0:
                normalized_scores = doc_scores / max_score
                for item_id, score in zip(BM25_IDS, normalized_scores):
                    keyword_scores[item_id] = score
        
        # 3. Reciprocal Rank Fusion
        final_scores = {}
        
        # From semantic results
        for rank, result in enumerate(semantic_results):
            item_id = result['id']
            rrf_score = semantic_weight / (rank + 60)
            final_scores[item_id] = final_scores.get(item_id, 0) + rrf_score
        
        # From keyword results
        sorted_keyword = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)
        for rank, (item_id, score) in enumerate(sorted_keyword[:50]):
            rrf_score = keyword_weight / (rank + 60)
            final_scores[item_id] = final_scores.get(item_id, 0) + rrf_score
        
        # 4. Get top results
        sorted_results = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
        top_ids = [item_id for item_id, score in sorted_results[:limit]]
        
        # 5. Fetch details from database
        conn = get_db_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if top_ids:
                cur.execute("""
                    SELECT id, title, overview, genres, poster_path, year
                    FROM media_items
                    WHERE id IN %s
                """, (tuple(top_ids),))
                results_map = {r['id']: r for r in cur.fetchall()}
        conn.close()
        
        # Package results
        final_results = []
        for item_id in top_ids:
            if item_id in results_map:
                result = results_map[item_id]
                result['hybrid_score'] = float(final_scores[item_id])
                final_results.append(result)
        
        return jsonify({
            "query": query,
            "intent": intent,
            "method": "hybrid",
            "results": final_results
        })
    
    except Exception as e:
        logger.error(f"Hybrid search error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/embeddings/stats', methods=['GET'])
def embedding_stats():
    """Get statistics about stored embeddings."""
    try:
        vector_db = VectorDB(DATABASE_URL)
        stats = vector_db.get_embedding_stats()
        vector_db.close()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
