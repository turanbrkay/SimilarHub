
import os
import numpy as np
import faiss
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import ast
import pickle
from rank_bm25 import BM25Okapi
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import string
import atexit
import logging

# Import connection pool utilities
from utils.db import get_db, init_connection_pool, close_connection_pool

# Import Flask-Limiter for rate limiting
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# --- AYARLAR ---
# Environment belirleme (default: development)
APP_ENV = os.getenv('APP_ENV', 'development')
dotenv_file = f".env.{APP_ENV}"

# Eğer spesifik env dosyası yoksa, fallback olarak .env'e bakabiliriz veya hata verebiliriz.
# Şimdilik sadece ilgili dosyayı yüklemeyi deniyoruz.
if os.path.exists(dotenv_file):
    load_dotenv(dotenv_file)
else:
    # Fallback: .env varsa yükle (eski alışkanlık)
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TMDB_IMAGE_URL = os.getenv("TMDB_IMAGE_URL", "https://image.tmdb.org/t/p/w500")
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
EMBEDDINGS_DIR = os.path.join(BASE_DIR, 'embeddings')
POPULAR_ITEMS_LIMIT = 10000
EMB_DIM = 2560

# --- VARSAYILAN AĞIRLIKLAR ---
DEFAULT_QUERY_TIME_WEIGHTS = {
    "emb_genres": 0.4,
    "emb_overview": 0.2,
    "emb_cast": 0.15,
    "emb_creator": 0.15,
    "emb_proco": 0.05,
    "bm25_overview": 0.05,
}

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
if not app.secret_key:
    if APP_ENV == 'production':
        raise ValueError("FLASK_SECRET_KEY must be set in production!")
    else:
        app.secret_key = "dev-secret-key-change-me"

# --- GLOBAL KAYNAKLAR ---
BM25_MODEL = None
BM25_IDS = None
POPULAR_ITEMS_COMPONENTS = {}

# ==========================================
# PRODUCTION SETUP - Initialize Connection Pool
# ==========================================
# Must initialize BEFORE loading resources (runs at module import time for Gunicorn)
print("Initializing database connection pool...")
try:
    init_connection_pool(
        database_url=DATABASE_URL,
        min_connections=5,
        max_connections=20
    )
    print("✅ Connection pool initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize connection pool: {e}")
    raise

# Register cleanup handler
def cleanup_handler():
    """Cleanup function called at application shutdown"""
    print("Shutting down: Closing connection pool...")
    close_connection_pool()
    print("Connection pool closed successfully")

atexit.register(cleanup_handler)

# ==========================================
# RATE LIMITING - Memory Backend
# ==========================================
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # In-memory storage (resets on restart)
    strategy="fixed-window",
    headers_enabled=True,
    swallow_errors=True  # Don't crash if limiter fails
)

# Custom error handler for rate limit exceeded
@app.errorhandler(429)
def ratelimit_handler(e):
    logging.warning(f"Rate limit exceeded: {request.remote_addr} {request.path}")
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please try again later.",
        "retry_after": str(e.description)
    }), 429

# --- NLTK VE METİN İŞLEME ---
try:
    stopwords.words('english')
except LookupError:
    nltk.download('stopwords')
    nltk.download('punkt')


def preprocess_text(text):
    if not text: return []
    stop_words = set(stopwords.words('english'))
    text = text.translate(str.maketrans('', '', string.punctuation))
    word_tokens = word_tokenize(text.lower())
    return [w for w in word_tokens if not w in stop_words]


def load_resources():
    global BM25_MODEL, BM25_IDS, POPULAR_ITEMS_COMPONENTS
    print("Kaynaklar yükleniyor...")

    try:
        bm25_path = os.path.join(EMBEDDINGS_DIR, 'bm25_overview.pkl')
        with open(bm25_path, 'rb') as f:
            bm25_data = pickle.load(f)
            BM25_MODEL = bm25_data['bm25_model']
            BM25_IDS = bm25_data['item_ids']
        print("BM25 indeksi yüklendi.")
    except Exception as e:
        print(f"Uyarı: BM25 indeksi yüklenemedi. {e}")

    print(f"En popüler {POPULAR_ITEMS_LIMIT} dizinin bileşenleri hafızaya yükleniyor...")
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                required_keys = list(key for key in DEFAULT_QUERY_TIME_WEIGHTS.keys() if key.startswith('emb_'))
                cur.execute("""
                    SELECT id, embeddings, overview
                    FROM media_items
                    WHERE source_type='tv' AND original_language='en'
                    ORDER BY popularity DESC NULLS LAST
                    LIMIT %s
                """, (POPULAR_ITEMS_LIMIT,))
                rows = cur.fetchall()
                for row in rows:
                    components = {key: row['embeddings'].get(key) for key in required_keys if
                                  row['embeddings'] and row['embeddings'].get(key)}
                    components['overview_text'] = row.get('overview', '')
                    POPULAR_ITEMS_COMPONENTS[row['id']] = components
        print(f"{len(POPULAR_ITEMS_COMPONENTS)} adet dizinin bileşenleri hafızaya yüklendi.")
    except Exception as e:
        print(f"Uyarı: Popüler item'lar yüklenemedi. {e}")


# Connection pooling now handled by utils/db
# get_db_connection() and get_db() context manager imported from utils.db


# ==========================================
# DEPRECATED - Runtime FAISS Similarity
# ==========================================
# DEPRECATED AS OF: 2024-12-05
# REPLACEMENT: Use /api/similar-map/<id> instead (70x faster, uses pre-computed database)
# REASON: Runtime FAISS computation is slow (~3.5s), pre-computed similarities are instant (~84ms)
# FUTURE: May be re-enabled for A/B testing or advanced search with dynamic weights
#
# @app.route('/similar/<int:tv_id>')
# def show_similar(tv_id):
    if not POPULAR_ITEMS_COMPONENTS:
        return "Popüler dizi bileşenleri hafızaya yüklenemedi.", 500

    source_item_components = POPULAR_ITEMS_COMPONENTS.get(tv_id)
    if not source_item_components:
        return f"Aranan dizi (ID: {tv_id}), en popüler {POPULAR_ITEMS_LIMIT} listesinde bulunmuyor.", 404

    active_weights = session.get('query_weights', DEFAULT_QUERY_TIME_WEIGHTS)

    # --- ANLIK AĞIRLIKLANDIRMA VE FAISS İNDEKSİ OLUŞTURMA ---
    candidate_ids, candidate_vectors = [], []
    for item_id, components in POPULAR_ITEMS_COMPONENTS.items():
        final_vec = np.zeros(EMB_DIM, dtype=np.float32)
        total_weight = 0
        for key, weight in active_weights.items():
            if key.startswith('emb_') and key in components and weight > 0:
                final_vec += np.array(components[key], dtype=np.float32) * weight
                total_weight += weight
        if total_weight > 0: final_vec /= total_weight
        candidate_ids.append(item_id)
        candidate_vectors.append(final_vec)

    candidate_vectors = np.array(candidate_vectors, dtype=np.float32)
    faiss.normalize_L2(candidate_vectors)
    index = faiss.IndexFlatIP(EMB_DIM)
    id_map = np.array(candidate_ids, dtype=np.int64)
    index.add(candidate_vectors)

    query_final_vec = np.zeros(EMB_DIM, dtype=np.float32)
    query_total_weight = 0
    for key, weight in active_weights.items():
        if key.startswith('emb_') and key in source_item_components and weight > 0:
            query_final_vec += np.array(source_item_components[key], dtype=np.float32) * weight
            query_total_weight += weight
    if query_total_weight > 0: query_final_vec /= query_total_weight

    query_vector = query_final_vec.reshape(1, -1)
    faiss.normalize_L2(query_vector)

    # --- STAGE 1: RETRIEVAL & FUSION ---
    final_scores = {}

    distances, indices = index.search(query_vector, 21)
    for i in range(len(indices[0])):
        item_id = int(id_map[indices[0][i]])
        if item_id == tv_id: continue
        score = distances[0][i]
        final_scores[item_id] = final_scores.get(item_id, 0) + score

    bm25_weight = active_weights.get("bm25_overview", 0)
    if BM25_MODEL and bm25_weight > 0 and source_item_components.get('overview_text'):
        tokenized_query = preprocess_text(source_item_components['overview_text'])
        doc_scores = BM25_MODEL.get_scores(tokenized_query)
        max_score = np.max(doc_scores)
        if max_score > 0:
            normalized_scores = doc_scores / max_score
            for item_id, score in zip(BM25_IDS, normalized_scores):
                if item_id == tv_id: continue
                weighted_score = score * bm25_weight
                final_scores[item_id] = final_scores.get(item_id, 0) + weighted_score

    sorted_candidates = sorted(final_scores.items(), key=lambda item: item[1], reverse=True)
    top_20_ids = [item_id for item_id, score in sorted_candidates[:20]]

    # --- Sonuçları Getirme ve Gösterme ---
    similar_items = []
    conn = get_db_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM media_items WHERE id = %s AND source_type = 'tv'", (tv_id,))
        source_item_details = cur.fetchone()

        if top_20_ids:
            cur.execute("SELECT id, title, poster_path, year, overview, genres FROM media_items WHERE id IN %s",
                        (tuple(top_20_ids),))
            results_map = {item['id']: item for item in cur.fetchall()}
            for item_id in top_20_ids:
                item_details = results_map.get(item_id)
                if item_details:
                    item_details['similarity_percent'] = int(min(final_scores[item_id], 1.0) * 100)
                    similar_items.append(item_details)
    conn.close()

    return render_template('similar.html', source_item=source_item_details, similar_items=similar_items,
                           image_url=TMDB_IMAGE_URL)


# ==========================================
# FUTURE FEATURE - Dynamic Similarity Weights
# ==========================================
# PLANNED FOR: Q2 2025
# DESCRIPTION: Allow users to customize similarity weights (genre, cast, overview, etc.)
# DEPENDENCIES: 
#   - User authentication system
#   - User preferences database table
#   - Modern pattern: JWT tokens instead of sessions
# NOTES: Current session-based approach needs refactoring
#
# @app.route('/api/preferences/weights', methods=['GET'])
# def get_similarity_weights():
#     """TODO: Get user's custom similarity weight preferences"""
#     pass
#
# @app.route('/api/preferences/weights', methods=['PUT'])
# def update_similarity_weights():
#     """TODO: Update user's custom similarity weight preferences"""
#     pass


# ==========================================
# DEPRECATED ENDPOINTS - Removed
# ==========================================
# The following endpoints have been removed as they are not used by the React SPA frontend
# Git history: commit f67cfa2 (2024-12-05)
#
# @app.route('/')  # REMOVED: Frontend uses React Router, no server-side rendering needed


@app.route('/search')
@app.route('/api/search')
@limiter.limit("10 per minute")  # Expensive ILIKE query
def search():
    query = request.args.get('q', '')
    if len(query) < 2: 
        return jsonify([])
    
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, title, poster_path, year, source_type FROM media_items WHERE title ILIKE %s LIMIT 100",
                    (f'%{query}%',))
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in search endpoint: {e}")
        return jsonify({
            "error": "Search failed",
            "message": "Unable to search for shows at this time"
        }), 500



# Frontend compatibility alias
@app.route('/api/shows/popular', methods=['GET'])
@limiter.limit("60 per minute")
def shows_popular():
    """Alias for popular-tv endpoint (frontend compatibility)"""
    try:
        return popular_tv()
    except Exception as e:
        logging.error(f"Error in shows_popular endpoint: {e}")
        return jsonify({
            "error": "Failed to fetch popular shows",
            "message": "Unable to retrieve popular shows at this time"
        }), 500


@app.route('/popular-tv', methods=['GET'])
@app.route('/api/popular-tv', methods=['GET'])
@limiter.limit("60 per minute")
def popular_tv():
    """En popüler ilk 50 TV dizisini döner."""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                    ORDER BY popularity DESC NULLS LAST
                    LIMIT 50
                """)
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in popular_tv endpoint: {e}")
        return jsonify({"error": "Failed to fetch popular TV shows"}), 500


@app.route('/popular-movies', methods=['GET'])
@app.route('/api/popular-movies', methods=['GET'])
@limiter.limit("60 per minute")
def popular_movies():
    """Returns top 50 random TV shows (temporary - will be movies later)"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                      AND poster_path IS NOT NULL
                      AND poster_path != ''
                    ORDER BY RANDOM()
                    LIMIT 50
                """)
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in popular_movies endpoint: {e}")
        return jsonify({"error": "Failed to fetch popular movies"}), 500


@app.route('/popular-books', methods=['GET'])
@app.route('/api/popular-books', methods=['GET'])
@limiter.limit("60 per minute")
def popular_books():
    """Returns top 50 random TV shows (temporary - will be books later)"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                      AND poster_path IS NOT NULL
                      AND poster_path != ''
                    ORDER BY RANDOM()
                    LIMIT 50
                """)
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in popular_books endpoint: {e}")
        return jsonify({"error": "Failed to fetch popular books"}), 500


@app.route('/top-rated', methods=['GET'])
@app.route('/api/top-rated', methods=['GET'])
@limiter.limit("60 per minute")
def top_rated():
    """Returns top 50 highest rated TV shows"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                      AND poster_path IS NOT NULL
                      AND poster_path != ''
                    ORDER BY popularity DESC NULLS LAST
                    LIMIT 50
                """)
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in top_rated endpoint: {e}")
        return jsonify({"error": "Failed to fetch top rated shows"}), 500


@app.route('/genre/<genre_name>', methods=['GET'])
@app.route('/api/genre/<genre_name>', methods=['GET'])
@limiter.limit("30 per minute")  # JSONB query overhead
def by_genre(genre_name):
    """Returns top 50 TV shows by genre"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Use jsonb_array_elements_text to expand the JSON string array and ILIKE for matching
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                      AND poster_path IS NOT NULL
                      AND poster_path != ''
                      AND EXISTS (
                          SELECT 1
                          FROM jsonb_array_elements_text(genres::jsonb) AS g
                          WHERE g ILIKE %s
                      )
                    ORDER BY popularity DESC NULLS LAST
                    LIMIT 50
                """, (f'%{genre_name}%',))
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        print(f"Error in by_genre endpoint for genre '{genre_name}': {e}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@app.route('/simple-similar/<int:tv_id>')
@limiter.limit("30 per minute")
def simple_similar(tv_id):
    """Genre-based simple similarity without embeddings - for testing"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get source show
                cur.execute("SELECT * FROM media_items WHERE id = %s AND source_type = 'tv'", (tv_id,))
                source_item = cur.fetchone()
                
                if not source_item:
                    return jsonify({"error": "Show not found"}), 404
                
                # Get source genres
                source_genres = source_item.get('genres', [])
                if isinstance(source_genres, str):
                    import json
                    source_genres = json.loads(source_genres)
                
                # Find similar shows based on genre overlap
                cur.execute("""
                    SELECT id, title, poster_path, year, overview, genres, popularity
                    FROM media_items 
                    WHERE source_type='tv' AND id != %s 
                    ORDER BY popularity DESC 
                    LIMIT 50
                """, (tv_id,))
                
                all_shows = cur.fetchall()
                
                # Calculate similarity score based on genre overlap
                similar_shows = []
                for show in all_shows:
                    show_genres = show.get('genres', [])
                    if isinstance(show_genres, str):
                        import json
                        show_genres = json.loads(show_genres)
                    
                    # Count matching genres
                    matching_genres = len(set(source_genres) & set(show_genres))
                    if matching_genres > 0:
                        similarity_percent = int((matching_genres / max(len(source_genres),  len(show_genres))) * 100)
                        show['similarity_percent'] = similarity_percent
                        similar_shows.append(show)
                
                # Sort by similarity and take top 10
                similar_shows.sort(key=lambda x: x['similarity_percent'], reverse=True)
                similar_shows = similar_shows[:10]
        
        return jsonify({
            "source_item": source_item,
            "similar_items": similar_shows
        })
    except Exception as e:
        logging.error(f"Error in simple_similar endpoint for tv_id={tv_id}: {e}")
        return jsonify({"error": "Failed to find similar shows"}), 500


@app.route('/similar-map/<int:item_id>')
@app.route('/api/similar-map/<int:item_id>')
@limiter.limit("20 per minute")  # Complex JOIN query
def similar_map(item_id):
    """Enhanced similar items endpoint - uses REAL similarity scores from database"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get source item
                cur.execute("""
                    SELECT id, title, poster_path, overview, genres, popularity,
                           year, original_language, source_type
                    FROM media_items
                    WHERE id = %s AND source_type = 'tv'
                """, (item_id,))
                source_item = cur.fetchone()

                if not source_item:
                    return jsonify({"error": "Item not found"}), 404

                # Get REAL similar items from similar_items table
                cur.execute("""
                    SELECT 
                        m.id, m.title, m.poster_path, m.overview,
                        m.genres, m.popularity, m.year, m.source_type,
                        si.score
                    FROM similar_items si
                    JOIN media_items m ON si.target_id = m.id
                    WHERE si.source_id = %s
                    ORDER BY si.score DESC
                    LIMIT 20
                """, (item_id,))

                similar_items = cur.fetchall()
        
        # Convert score (0-1) to percentage (0-100) and clean poster paths
        for item in similar_items:
            item['similarity_percent'] = int(item['score'] * 100)
            if item.get('popularity'):
                item['vote_average'] = min(10.0, (item['popularity'] / 100.0) * 1.2)
            del item['score']
            
            # Strip tvmaze: prefix from poster_path so frontend can use full URL
            if item.get('poster_path') and item['poster_path'].startswith('tvmaze:'):
                item['poster_path'] = item['poster_path'].replace('tvmaze:', '', 1)
        
        # Clean source item poster too
        if source_item.get('poster_path') and source_item['poster_path'].startswith('tvmaze:'):
            source_item['poster_path'] = source_item['poster_path'].replace('tvmaze:', '', 1)

        return jsonify({
            "source_item": source_item,
            "similar_items": similar_items
        })
    except Exception as e:
        logging.error(f"Error in similar_map endpoint for item_id={item_id}: {e}")
        return jsonify({"error": "Failed to get similar items"}), 500

@app.route('/api/most-loved', methods=['GET'])
@limiter.limit("60 per minute")
def most_loved():
    """Get most-loved content by platform and type"""
    try:
        platform = request.args.get('platform', 'Netflix')
        content_type = request.args.get('type', 'Movies')
        
        # For now, return popular TV shows
        # TODO: Filter by platform when metadata is available
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        id,
                        title,
                        poster_path,
                        year,
                        overview,
                        genres,
                        popularity,
                        source_type
                    FROM media_items
                    WHERE source_type = 'tv'
                      AND poster_path IS NOT NULL
                      AND poster_path != ''
                    ORDER BY popularity DESC NULLS LAST
                    LIMIT 30
                """)
                results = cur.fetchall()
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in most_loved endpoint: {e}")
        return jsonify({"error": "Failed to fetch most-loved content"}), 500


# ==========================================
# HEALTH CHECK ENDPOINTS
# ==========================================
@app.route('/health')
@app.route('/api/health')
def health():
    """
    Basic health check endpoint.
    Used for liveness probes in Kubernetes/orchestration.
    """
    return jsonify({
        "status": "healthy",
        "service": "SimilarHub Backend"
    }), 200


@app.route('/health/ready')
@app.route('/api/health/ready')
def health_ready():
    """
    Readiness check endpoint.
    Verifies database connectivity before accepting traffic.
    Used for readiness probes in Kubernetes/load balancers.
    """
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        
        return jsonify({
            "status": "ready",
            "database": "connected",
            "service": "SimilarHub Backend"
        }), 200
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({
            "status": "not ready",
            "database": "disconnected",
            "error": str(e)
        }), 503


if __name__ == '__main__':
    # Load resources (BM25, embeddings)
    # Pool already initialized at module level
    load_resources()
    
    # Start Flask application
    debug_mode = os.getenv('FLASK_DEBUG', '0').lower() in ['1', 'true', 'yes']
    app.run(debug=debug_mode, use_reloader=False)