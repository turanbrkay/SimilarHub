@app.route('/similar-map/<int:item_id>')
@app.route('/api/similar-map/<int:item_id>')
def similar_map(item_id):
    """Enhanced similar items endpoint - uses REAL similarity scores from database"""
    conn = get_db_connection()
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
            conn.close()
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

    conn.close()
    
    # Convert score (0-1) to percentage (0-100)
    for item in similar_items:
        item['similarity_percent'] = int(item['score'] * 100)
        if item.get('popularity'):
            item['vote_average'] = min(10.0, (item['popularity'] / 100.0) * 1.2)
        del item['score']

    return jsonify({
        "source_item": source_item,
        "similar_items": similar_items
    })
