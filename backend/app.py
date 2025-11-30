
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
        conn = get_db_connection()
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
        conn.close()
        print(f"{len(POPULAR_ITEMS_COMPONENTS)} adet dizinin bileşenleri hafızaya yüklendi.")
    except Exception as e:
        print(f"Uyarı: Popüler item'lar yüklenemedi. {e}")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# --- ANA ARAMA VE SIRALAMA MANTIĞI ---
@app.route('/similar/<int:tv_id>')
def show_similar(tv_id):
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


@app.route('/get-weights', methods=['GET'])
def get_weights():
    """Mevcut aktif ağırlıkları arayüze gönderir."""
    current_weights = session.get('query_weights', DEFAULT_QUERY_TIME_WEIGHTS)
    return jsonify(current_weights)


@app.route('/update-weights', methods=['POST'])
def update_weights():
    """Arayüzden gelen yeni ağırlıkları session'a kaydeder."""
    new_weights = request.json
    validated_weights = {}
    for key, default_value in DEFAULT_QUERY_TIME_WEIGHTS.items():
        try:
            validated_weights[key] = float(new_weights.get(key, 0.0))
        except (ValueError, TypeError):
            validated_weights[key] = 0.0

    session['query_weights'] = validated_weights
    return jsonify({"status": "success", "message": "Ağırlıklar güncellendi."})


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/search')
@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    if len(query) < 2: return jsonify([])
    conn = get_db_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, title, poster_path, year, source_type FROM media_items WHERE title ILIKE %s LIMIT 100",
            (f'%{query}%',))
        results = cur.fetchall()
    conn.close()
    return jsonify(results)


@app.route('/popular-tv', methods=['GET'])
@app.route('/api/popular-tv', methods=['GET'])
def popular_tv():
    """En popüler ilk 50 TV dizisini döner."""
    conn = get_db_connection()
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
    conn.close()
    return jsonify(results)


@app.route('/popular-movies', methods=['GET'])
@app.route('/api/popular-movies', methods=['GET'])
def popular_movies():
    """Returns top 50 random TV shows (temporary - will be movies later)"""
    conn = get_db_connection()
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
    conn.close()
    return jsonify(results)


@app.route('/popular-books', methods=['GET'])
@app.route('/api/popular-books', methods=['GET'])
def popular_books():
    """Returns top 50 random TV shows (temporary - will be books later)"""
    conn = get_db_connection()
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
    conn.close()
    return jsonify(results)


@app.route('/top-rated', methods=['GET'])
@app.route('/api/top-rated', methods=['GET'])
def top_rated():
    """Returns top 50 highest rated TV shows"""
    conn = get_db_connection()
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
    conn.close()
    return jsonify(results)


@app.route('/most-loved', methods=['GET'])
@app.route('/api/most-loved', methods=['GET'])
def most_loved():
    """Returns most-loved content filtered by platform and type"""
    platform = request.args.get('platform', 'Netflix')
    content_type = request.args.get('type', 'Movies')

    # Map to source_type
    source_type = 'movie' if content_type == 'Movies' else 'tv'

    conn = get_db_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Use vote_average as "most-loved" metric
        # Platform filtering is placeholder for future enhancement
        cur.execute("""
            SELECT
                id,
                title,
                name,
                poster_path,
                year,
                overview,
                genres,
                popularity,
                source_type,
                vote_average
            FROM media_items
            WHERE source_type = %s
              AND poster_path IS NOT NULL
              AND poster_path != ''
              AND vote_average IS NOT NULL
            ORDER BY vote_average DESC, popularity DESC
            LIMIT 20
        """, (source_type,))
        results = cur.fetchall()
    conn.close()
    return jsonify(results)


@app.route('/genre/<genre_name>', methods=['GET'])
@app.route('/api/genre/<genre_name>', methods=['GET'])
def by_genre(genre_name):
    """Returns top 50 TV shows by genre"""
    try:
        conn = get_db_connection()
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
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Error in by_genre endpoint for genre '{genre_name}': {e}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@app.route('/simple-similar/<int:tv_id>')
def simple_similar(tv_id):
    """Genre-based simple similarity without embeddings - for testing"""
    conn = get_db_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get source show
        cur.execute("SELECT * FROM media_items WHERE id = %s AND source_type = 'tv'", (tv_id,))
        source_item = cur.fetchone()
        
        if not source_item:
            conn.close()
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
    
    conn.close()
    
    return jsonify({
        "source_item": source_item,
        "similar_items": similar_shows
    })


@app.route('/similar-map/<int:item_id>')
@app.route('/api/similar-map/<int:item_id>')
def similar_map(item_id):
    """Enhanced similar items endpoint for visual similarity map with real database fields"""
    conn = get_db_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Get source item with all available fields from actual schema
        cur.execute("""
            SELECT id, title, poster_path, overview, genres, popularity,
                   year, original_language, source_type
            FROM media_items
            WHERE id = %s AND source_type = 'tv'
        """, (item_id,))
        source_item = cur.fetchone()

        if not source_item:
            conn.close()
            return jsonify({"error": "Item not found"}), 404

        # Get up to 210 similar items (30 rows * 7 items)
        # We order by popularity here as a fallback since this is the mocked/fast endpoint.
        # Ideally this would use FAISS like the /similar/ endpoint but for 210 items.
        cur.execute("""
            SELECT id, title, poster_path, overview, genres, popularity, year, source_type
            FROM media_items
            WHERE source_type = 'tv'
              AND id != %s
              AND poster_path IS NOT NULL
              AND poster_path != ''
            ORDER BY popularity DESC
            LIMIT 210
        """, (item_id,))

        similar_items = cur.fetchall()

        # Generate similarity_percent
        # We want to span roughly 98% down to 40% over 210 items.
        # Formula: 98 - (i * 0.28) ~ 98 - 58 = 40.
        for i, item in enumerate(similar_items):
            # Calculate mock similarity decreasing with rank
            sim = 98 - (i * 0.28)
            item['similarity_percent'] = int(max(40, sim))
            
            # Convert popularity (0-1000+) to vote_average (0-10) for display
            if item.get('popularity'):
                item['vote_average'] = min(10.0, (item['popularity'] / 100.0) * 1.2)

    conn.close()

    return jsonify({
        "source_item": source_item,
        "similar_items": similar_items
    })


if __name__ == '__main__':
    load_resources()
    debug_mode = os.getenv('FLASK_DEBUG', '0').lower() in ['1', 'true', 'yes']
    app.run(debug=debug_mode, use_reloader=False)