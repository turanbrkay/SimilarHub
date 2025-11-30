"""
Vector Database Operations for PostgreSQL with pgvector
Handles multi-vector storage, indexing, and similarity search
"""

import logging
from typing import Dict, List, Tuple, Optional
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
import json
from pgvector.psycopg2 import register_vector
from keyword_similarity import weighted_jaccard_similarity, normalize_keywords

logger = logging.getLogger(__name__)


class VectorDB:
    """
    PostgreSQL + pgvector operations for multi-vector TV show storage.
    """
    
    def __init__(self, connection_string: str):
        """
        Initialize database connection.
        
        Args:
            connection_string: PostgreSQL connection string
        """
        self.connection_string = connection_string
        self.conn = None
        self._connect()
    
    def _connect(self):
        """Establish database connection and register vector type."""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            register_vector(self.conn)
            logger.info("Connected to PostgreSQL with pgvector")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def ensure_vector_columns(self):
        """
        Add vector columns to media_items table if they don't exist.
        Creates 3 columns for multi-vector storage (1024-dim for BGE-M3).
        """
        with self.conn.cursor() as cur:
            # Check if columns exist
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='media_items' 
                AND column_name IN ('embedding_analytical', 'embedding_plot')
            """)
            existing = {row[0] for row in cur.fetchall()}
            
            # Add missing columns
            for col_name in ['embedding_analytical', 'embedding_plot']:
                if col_name not in existing:
                    logger.info(f"Adding column: {col_name}")
                    cur.execute(f"""
                        ALTER TABLE media_items 
                        ADD COLUMN IF NOT EXISTS {col_name} vector(1024)
                    """)
            
            self.conn.commit()
            logger.info("Vector columns ensured")
    
    def create_vector_indexes(self):
        """
        Create HNSW indexes for fast similarity search.
        HNSW (Hierarchical Navigable Small World) is efficient for high-dimensional vectors.
        """
        with self.conn.cursor() as cur:
            for col_name in ['embedding_analytical', 'embedding_plot']:
                index_name = f"idx_{col_name}_hnsw"
                
                # Check if index exists
                cur.execute(f"""
                    SELECT 1 FROM pg_indexes 
                    WHERE indexname = '{index_name}'
                """)
                
                if not cur.fetchone():
                    logger.info(f"Creating HNSW index: {index_name}")
                    cur.execute(f"""
                        CREATE INDEX {index_name} 
                        ON media_items 
                        USING hnsw ({col_name} vector_cosine_ops)
                    """)
            
            self.conn.commit()
            logger.info("HNSW indexes created")
    
    def insert_embedding(self, show_id: int, embeddings: Dict[str, np.ndarray]):
        """
        Insert or update embeddings for a single show.
        
        Args:
            show_id: Database ID of the TV show
            embeddings: Dict with 'analytical' and 'plot' vectors only
        """
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE media_items 
                SET 
                    embedding_analytical = %s,
                    embedding_plot = %s
                WHERE id = %s
            """, (
                embeddings['analytical'].tolist(),
                embeddings['plot'].tolist(),
                show_id
            ))
        
        self.conn.commit()
    
    def insert_embeddings_batch(self, data: List[Tuple[int, Dict[str, np.ndarray]]]):
        """
        Batch insert embeddings for multiple shows (much faster).
        
        Args:
            data: List of (show_id, embeddings_dict) tuples
        """
        with self.conn.cursor() as cur:
            # Prepare data for batch update
            update_data = [
                (
                    embeds['analytical'].tolist(),
                    embeds['plot'].tolist(),
                    show_id
                )
                for show_id, embeds in data
            ]
            
            # Batch update using execute_values
            execute_values(
                cur,
                """
                UPDATE media_items AS t SET
                    embedding_analytical = v.analytical,
                    embedding_plot = v.plot
                FROM (VALUES %s) AS v(analytical, plot, id)
                WHERE t.id = v.id
                """,
                update_data,
                template="(%s::vector, %s::vector, %s)"
            )
        
        self.conn.commit()
        logger.info(f"Batch inserted {len(data)} embeddings")
    
    def insert_keywords(self, show_id: int, keywords: Dict[str, List[str]]):
        """
        Insert or update categorized keywords for a show.
        
        Args:
            show_id: ID of the show
            keywords: Dictionary of categorized keywords from LLM
        """
        normalized_keywords = normalize_keywords(keywords)
        
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE media_items SET keywords_json = %s WHERE id = %s",
                (json.dumps(normalized_keywords), show_id)
            )
        
        self.conn.commit()
    
    def insert_keywords_batch(self, data: List[Tuple[int, Dict[str, List[str]]]]):
        """
        Batch insert keywords for multiple shows.
        
        Args:
            data: List of (show_id, keywords_dict) tuples
        """
        if not data:
            return
            
        with self.conn.cursor() as cur:
            # Build individual UPDATE statements
            for show_id, keywords in data:
                normalized_keywords = normalize_keywords(keywords)
                cur.execute(
                    "UPDATE media_items SET keywords_json = %s::jsonb WHERE id = %s",
                    (json.dumps(normalized_keywords), show_id)
                )
        
        self.conn.commit()
        logger.info(f"Batch inserted keywords for {len(data)} shows")
    
    def search_multi_vector(
        self, 
        query_vectors: Dict[str, np.ndarray] = None,
        query_keywords: Dict[str, List[str]] = None,
        weights: Dict[str, float] = None,
        limit: int = 10,
        min_score: float = 0.0
    ) -> List[Dict]:
        """
        Hybrid multi-vector weighted similarity search.
        
        Uses:
        - Vector embeddings for analytical and plot (cosine similarity)
        - Weighted Jaccard for keywords (set-based matching)
        
        Args:
            query_vectors: Dict with 'analytical', 'plot' query vectors (embeddings)
            query_keywords: Dict with categorized keywords for Weighted Jaccard
            weights: Weight for each component (default: mixed profile)
            limit: Number of results to return
            min_score: Minimum similarity score threshold
            
        Returns:
            List of dicts with show data and similarity scores
        """
        if weights is None:
            weights = {'analytical': 0.40, 'plot': 0.25, 'keywords': 0.35}
        
        # Normalize query keywords if provided
        if query_keywords:
            query_keywords = normalize_keywords(query_keywords)
        
        with self.conn.cursor() as cur:
            # Fetch candidates using vector similarity for analytical + plot
            # We'll calculate keyword similarity in Python using Weighted Jaccard
            
            # Get more candidates than needed since we'll re-rank with keywords
            candidate_limit = min(limit * 5, 500)  # Get 5x candidates for re-ranking
            
            if query_vectors and 'analytical' in query_vectors and 'plot' in query_vectors:
                # SQL query: vector search for analytical + plot only
                cur.execute("""
                    SELECT 
                        id,
                        title,
                        overview,
                        genres,
                        (1 - (embedding_analytical <=> %s::vector)) as sim_analytical,
                        (1 - (embedding_plot <=> %s::vector)) as sim_plot,
                        keywords_json
                    FROM media_items
                    WHERE 
                        embedding_analytical IS NOT NULL AND
                        embedding_plot IS NOT NULL
                    ORDER BY (
                        %s * (1 - (embedding_analytical <=> %s::vector)) +
                        %s * (1 - (embedding_plot <=> %s::vector))
                    ) DESC
                    LIMIT %s
                """, (
                    query_vectors['analytical'].tolist(),
                    query_vectors['plot'].tolist(),
                    weights['analytical'],
                    query_vectors['analytical'].tolist(),
                    weights['plot'],
                    query_vectors['plot'].tolist(),
                    candidate_limit
                ))
            
                results = []
                for row in cur.fetchall():
                    show_id = row[0]
                    title = row[1]
                    overview = row[2]
                    genres = row[3]
                    sim_analytical = float(row[4])
                    sim_plot = float(row[5])
                    keywords_json = row[6]
                    
                    # Calculate keyword similarity using Weighted Jaccard
                    sim_keywords = 0.0
                    if query_keywords and keywords_json:
                        try:
                            show_keywords = json.loads(keywords_json) if isinstance(keywords_json, str) else keywords_json
                            sim_keywords = weighted_jaccard_similarity(query_keywords, show_keywords)
                        except (json.JSONDecodeError, TypeError) as e:
                            logger.warning(f"Error parsing keywords for show {show_id}: {e}")
                            sim_keywords = 0.0
                    
                    # Calculate final weighted score
                    final_score = (
                        weights['analytical'] * sim_analytical +
                        weights['plot'] * sim_plot +
                        weights['keywords'] * sim_keywords
                    )
                    
                    if final_score >= min_score:
                        results.append({
                            'id': show_id,
                            'title': title,
                            'overview': overview,
                            'genres': genres,
                            'similarity_scores': {
                                'analytical': sim_analytical,
                                'plot': sim_plot,
                                'keywords': sim_keywords
                            },
                            'final_score': final_score
                        })
                
                # Sort by final score and return top K
                results.sort(key=lambda x: x['final_score'], reverse=True)
                return results[:limit]
            
            else:
                # Fallback: old behavior if no vectors provided
                return []
    
    def get_embedding_stats(self) -> Dict:
        """
        Get statistics about stored embeddings.
        
        Returns:
            Dict with counts and percentages
        """
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(embedding_analytical) as with_analytical,
                    COUNT(embedding_plot) as with_plot,
                    COUNT(*) FILTER (WHERE 
                        embedding_analytical IS NOT NULL AND
                        embedding_plot IS NOT NULL
                    ) as with_all_vectors
                FROM media_items
            """)
            
            row = cur.fetchone()
            total = row[0]
            
            return {
                'total_shows': total,
                'with_analytical': row[1],
                'with_plot': row[2],
                'with_all_vectors': row[3],
                'completion_rate': (row[3] / total * 100) if total > 0 else 0
            }
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")


    def save_similarities(self, source_id: int, similarities: List[Dict]):
        """
        Save pre-calculated similarities for a show.
        
        Args:
            source_id: ID of the source show
            similarities: List of dicts with 'id', 'final_score', 'similarity_scores'
        """
        if not similarities:
            return

        with self.conn.cursor() as cur:
            # Delete existing similarities for this show to avoid stale data
            cur.execute("DELETE FROM similar_items WHERE source_id = %s", (source_id,))
            
            # Prepare data for batch insert
            insert_data = [
                (
                    source_id,
                    item['id'],
                    item['final_score'],
                    json.dumps(item['similarity_scores'])
                )
                for item in similarities
            ]
            
            execute_values(
                cur,
                """
                INSERT INTO similar_items (source_id, target_id, score, similarity_details)
                VALUES %s
                ON CONFLICT (source_id, target_id) DO UPDATE 
                SET score = EXCLUDED.score, similarity_details = EXCLUDED.similarity_details
                """,
                insert_data
            )
        
        self.conn.commit()

    def get_similar_shows(self, show_id: int, limit: int = 20) -> List[Dict]:
        """
        Get pre-calculated similar shows from database.
        
        Args:
            show_id: ID of the show
            limit: Max number of results
            
        Returns:
            List of similar shows with details
        """
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    m.id,
                    m.title,
                    m.overview,
                    m.genres,
                    m.year,
                    s.score,
                    s.similarity_details
                FROM similar_items s
                JOIN media_items m ON s.target_id = m.id
                WHERE s.source_id = %s
                ORDER BY s.score DESC
                LIMIT %s
            """, (show_id, limit))
            
            results = []
            for row in cur.fetchall():
                results.append({
                    'id': row[0],
                    'title': row[1],
                    'overview': row[2],
                    'genres': row[3],
                    'year': row[4],
                    'score': row[5],
                    'similarity_details': row[6]
                })
            
            return results

# Weight profiles for different query intents
WEIGHT_PROFILES = {
    'user_custom': {
        'analytical': 0.3,
        'plot': 0.45,
        'keywords': 0.25
    }
}
