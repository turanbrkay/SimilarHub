# SimilarHub Deployment Log

## Sistem Mimarisi

**Hibrit Benzerlik Sistemi (v2.0):**
- **Analytical Summary**: BGE-M3 embedding (1024-dim) → Cosine similarity
- **Plot Summary**: BGE-M3 embedding (1024-dim) → Cosine similarity
- **Keywords**: Weighted Jaccard (kategorilenmiş JSON) → Set-based matching

**Mevcut Ağırlıklar:**
```python
{
    'analytical': 0.30,
    'plot': 0.45,
    'keywords': 0.25  # Weighted Jaccard
}
```

---

## 1. İlk Kurulum (Tek Seferlik)

### 1.1 Docker Konteynerlerini Başlat
```bash
# Tüm servisleri başlat
docker-compose up -d

# Sadece backend'i rebuild et
docker-compose up -d --build backend
```

### 1.2 Veritabanı Migration
```bash
# Temel şemayı oluştur
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -f /docker-entrypoint-initdb.d/init.sql

# Vector kolonlarını ekle
docker-compose exec -T db psql -U similarhub_user -d similarhub_db < database/migrations/add_vector_columns.sql

# Keywords JSON kolonunu ekle (yeni sistem)
docker-compose exec -T db psql -U similarhub_user -d similarhub_db < database/migrations/003_add_keywords_json.sql
```

### 1.3 Database Sequence Senkronizasyonu (Opsiyonel)
```bash
# Eğer "duplicate key" hatası alırsan
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "SELECT setval('media_items_id_seq', (SELECT MAX(id) FROM media_items));"
```

---

## 2. Embedding ve Keyword Generation

### 2.1 Tüm Diziler İçin Embedding Oluştur
```bash
# 3800+ dizi için (~2-3 saat sürer)
# Analytical + Plot embeddings + keywords_json oluşturur
docker-compose exec backend python scripts/process_embeddings.py

# İlerlemeyi takip et
docker logs -f similarhub-backend
```

### 2.2 Belirli Sayıda Dizi İçin
```bash
# İlk 100 dizi (test için)
docker-compose exec backend python scripts/process_embeddings.py --limit 100

# İlk 500 dizi
docker-compose exec backend python scripts/process_embeddings.py --limit 500
```

### 2.3 Embedding Durumunu Kontrol Et
```bash
# Kaç dizide tam embedding var?
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT 
    COUNT(*) as total,
    COUNT(embedding_analytical) as analytical_count,
    COUNT(embedding_plot) as plot_count,
    COUNT(keywords_json) as keywords_count
FROM media_items;"

# Embedding istatistikleri
docker-compose exec backend python -c "
from vector_db import VectorDB
import os
db = VectorDB(os.getenv('DATABASE_URL'))
stats = db.get_embedding_stats()
for k,v in stats.items():
    print(f'{k}: {v}')
"
```

---

## 3. Benzerlik Hesaplama

### 3.1 Tüm Diziler İçin Benzerlik Hesapla
```bash
# Her dizi için en benzer 20 diziyi hesapla ve kaydet
docker-compose exec backend python scripts/calculate_similarities.py --top-k 20

# Daha fazla benzer dizi kaydet (ama daha yavaş)
docker-compose exec backend python scripts/calculate_similarities.py --top-k 50

# İlerlemeyi takip et
docker logs -f similarhub-backend
```

### 3.2 Benzerlik Sonuçlarını Kontrol Et
```bash
# similar_items tablosunda kaç kayıt var?
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "SELECT COUNT(*) FROM similar_items;"

# Örnek: Breaking Bad'in benzer dizileri
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT 
    m1.title AS source,
    m2.title AS similar,
    si.score
FROM similar_items si
JOIN media_items m1 ON si.source_id = m1.id
JOIN media_items m2 ON si.target_id = m2.id
WHERE m1.title = 'Breaking Bad'
ORDER BY si.score DESC
LIMIT 10;
"
```

---

## 4. Anlık Benzerlik Testi

### 4.1 Bir Dizi İçin Benzer Dizileri Bul
```bash
# Breaking Bad için benzer diziler
docker-compose exec backend python scripts/find_similar.py "Breaking Bad" --limit 10

# Stranger Things için (varsayılan 20 sonuç)
docker-compose exec backend python scripts/find_similar.py "Stranger Things"

# Suits için (hukuk dizileri bekleniyor)
docker-compose exec backend python scripts/find_similar.py "Suits" --limit 10

# Friends için (sitcom'lar bekleniyor)
docker-compose exec backend python scripts/find_similar.py "Friends" --limit 10
```

**Not:** Bu komut anlık hesaplama yapar, veritabanındaki `similar_items` tablosunu kullanmaz.

---

## 5. Ağırlık Optimizasyonu

### 5.1 Optimal Ağırlıkları Bul
```bash
# Grid search ile en iyi ağırlıkları bul (step=0.1)
docker-compose exec backend python scripts/optimize_weights.py --step 0.1

# Daha hassas arama (daha uzun sürer)
docker-compose exec backend python scripts/optimize_weights.py --step 0.05
```

### 5.2 Ağırlıkları Güncelle
```bash
# backend/vector_db.py dosyasını düzenle:
WEIGHT_PROFILES = {
    'user_custom': {
        'analytical': 0.30,
        'plot': 0.45,
        'keywords': 0.25
    }
}

# Backend'i rebuild et
docker-compose up -d --build backend

# Yeni ağırlıklarla benzerlik hesapla
docker-compose exec backend python scripts/calculate_similarities.py --top-k 20
```

---

## 6. Veri Kontrolü ve Debug

### 6.1 Keywords Kontrolü
```bash
# Kaç dizide keywords_json var?
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT COUNT(*) FROM media_items WHERE keywords_json IS NOT NULL;"

# Örnek keyword verisi göster
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT title, keywords_json 
FROM media_items 
WHERE keywords_json IS NOT NULL 
LIMIT 3;"

# Belirli bir dizinin keywords'ünü göster
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT title, keywords_json 
FROM media_items 
WHERE title = 'Stranger Things';"
```

### 6.2 Embedding Kontrolü
```bash
# Hangi dizilerde embedding eksik?
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT id, title 
FROM media_items 
WHERE embedding_analytical IS NULL 
   OR embedding_plot IS NULL 
LIMIT 10;"

# Toplam embedding sayısı
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT 
    COUNT(*) as total_shows,
    COUNT(embedding_analytical) as with_analytical,
    COUNT(embedding_plot) as with_plot,
    COUNT(CASE WHEN embedding_analytical IS NOT NULL AND embedding_plot IS NOT NULL THEN 1 END) as complete
FROM media_items;"
```

### 6.3 Benzerlik Sonuçlarını Dışa Aktar
```bash
# Top 15 benzer dizileri sonuclar.txt'ye kaydet
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
WITH RankedSimilarities AS (
    SELECT
        source_id,
        target_id,
        score,
        ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY score DESC) as rank
    FROM similar_items
)
SELECT
    m1.title AS source_show,
    m2.title AS similar_show,
    rs.score
FROM RankedSimilarities rs
JOIN media_items m1 ON rs.source_id = m1.id
JOIN media_items m2 ON rs.target_id = m2.id
WHERE rs.rank <= 15
ORDER BY m1.title, rs.score DESC;
" > sonuclar.txt

cat sonuclar.txt
```

---

## 7. Log ve Debugging

### 7.1 Container Loglarını İzle
```bash
# Backend logları (canlı)
docker logs -f similarhub-backend

# Son 100 satır
docker logs --tail 100 similarhub-backend

# PostgreSQL logları
docker logs -f similarhub-db
```

### 7.2 Container'a Bağlan
```bash
# Backend'e shell ile bağlan
docker-compose exec backend bash

# PostgreSQL'e bağlan
docker-compose exec db psql -U similarhub_user -d similarhub_db
```

### 7.3 Container Durumunu Kontrol Et
```bash
# Tüm container'ları listele
docker-compose ps

# Backend'i yeniden başlat
docker-compose restart backend

# Tüm servisleri yeniden başlat
docker-compose restart
```

---

## 8. Sistem Özellikleri

### Weighted Jaccard Kategori Ağırlıkları
```python
CATEGORY_WEIGHTS = {
    'genre_and_tropes': 5.0,      # En önemli (crime-drama, legal-thriller)
    'mood_and_tone': 3.0,          # Çok önemli (dark, suspenseful)
    'themes': 2.5,                 # Önemli (justice, redemption)
    'plot_and_concepts': 2.0,      # Orta (time-travel, conspiracy)
    'character_archetypes': 1.5,   # Az önemli (anti-hero, detective)
    'narrative_style': 1.5,        # Az önemli (serialized, procedural)
    'setting': 1.0,                # Çok az önemli (modern-day, NYC)
    'target_audience': 1.0,        # Çok az önemli (mature-audiences)
    'detail_plot': 0.5             # En az önemli (çok spesifik detaylar)
}
```

### Performans
- **Embedding Generation**: ~40-60 saniye/batch (32 dizi)
- **Similarity Calculation**: ~2-3 dakika (3800+ dizi, top-k=20)
- **Vector Search**: < 100ms (HNSW index ile)
- **Weighted Jaccard**: < 1ms (post-processing)

---

## 9. Sorun Giderme

### Embedding Hatası
```bash
# Eğer "no module named 'embedding_service'" hatası alırsan
docker-compose up -d --build backend

# Model yükleme hatası
docker volume create similarhub_huggingface_cache
docker-compose restart backend
```

### Database Hatası
```bash
# Sequence senkron değilse
docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
SELECT setval('media_items_id_seq', (SELECT MAX(id) FROM media_items));"

# Connection error
docker-compose restart db
```

### Keyword Eksikliği
```bash
# Eğer keywords_json NULL ise, process_embeddings çalıştır
docker-compose exec backend python scripts/process_embeddings.py --limit 100
```

---

## 10. Optimizasyon Notları

**Son Optimizasyon Sonucu:**
- analytical: 0.10
- plot: 0.65
- keywords: 0.25

**Önerilen Ağırlıklar (Golden Set'e göre):**
- Drama dizileri için: analytical düşük, plot yüksek
- Sitcom'lar için: keywords daha önemli (genre matching)
- Genel kullanım: analytical=0.3, plot=0.45, keywords=0.25