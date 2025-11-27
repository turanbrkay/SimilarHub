#!/usr/bin/env python3
"""
SimilarHub Data Import Script
Bu script TMDB_tv_dataset.csv dosyasından TV dizi verilerini okuyup PostgreSQL veritabanına yükler.
"""

import os
import csv
import json
import psycopg2
import psycopg2.extras
from datetime import datetime
from dotenv import load_dotenv

# Environment değişkenlerini yükle
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CSV_FILE = "/app/database/TMDB_tv_dataset.csv"
BATCH_SIZE = 1000  # Her seferde kaç kayıt insert edeceğimiz

def parse_year(date_str):
    """Tarih string'inden yıl bilgisini çıkarır"""
    if not date_str or date_str == "":
        return None
    try:
        return int(date_str.split("-")[0])
    except:
        return None

def parse_json_field(field_str):
    """String JSON'u liste'ye dönüştürür"""
    if not field_str or field_str == "":
        return []
    try:
        # Eğer zaten liste ise
        if isinstance(field_str, list):
            return field_str
        # String'i parse et
        items = [item.strip() for item in field_str.split(",")]
        return items
    except:
        return []

def clean_genres(genres_str):
    """Genres string'ini JSON array'e dönüştürür"""
    if not genres_str or genres_str == "":
        return json.dumps([])
    
    try:
        # "Sci-Fi & Fantasy, Drama, Action & Adventure" -> ["Sci-Fi & Fantasy", "Drama", "Action & Adventure"]
        genres = [g.strip() for g in genres_str.split(",")]
        return json.dumps(genres)
    except:
        return json.dumps([])

def import_tv_shows():
    """CSV dosyasından TV dizilerini veritabanına import eder"""
    
    if not DATABASE_URL:
        print("❌ HATA: DATABASE_URL environment değişkeni tanımlı değil!")
        print("Lütfen .env dosyasını kontrol edin.")
        return
    
    if not os.path.exists(CSV_FILE):
        print(f"❌ HATA: CSV dosyası bulunamadı: {CSV_FILE}")
        return
    
    print("=" * 80)
    print("SimilarHub - TV Dizileri Veri Import Scripti")
    print("=" * 80)
    print(f"📁 CSV Dosyası: {CSV_FILE}")
    print(f"🗄️  Veritabanı: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    print()
    
    # Veritabanına bağlan
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Veritabanı bağlantısı başarılı")
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {e}")
        return
    
    # Veritabanını temizle (isteğe bağlı)
    print("\n⚠️  Mevcut TV dizileri siliniyor...")
    try:
        cur.execute("DELETE FROM media_items WHERE source_type = 'tv'")
        conn.commit()
        print("✅ Veritabanı temizlendi")
    except Exception as e:
        print(f"⚠️  Temizleme hatası (devam ediliyor): {e}")
        conn.rollback()
    
    # CSV dosyasını oku ve import et
    print(f"\n📖 CSV dosyası okunuyor...")
    
    batch = []
    total_processed = 0
    total_inserted = 0
    errors = 0
    
    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total_processed += 1
                
                try:
                    # Veriyi hazırla
                    tv_show = {
                        'id': int(row['id']),
                        'title': row['name'][:500] if row.get('name') else 'Unknown',
                        'poster_path': row.get('poster_path', ''),
                        'year': parse_year(row.get('first_air_date', '')),
                        'overview': row.get('overview', ''),
                        'genres': clean_genres(row.get('genres', '')),
                        'source_type': 'tv',
                        'original_language': row.get('original_language', 'en'),
                        'popularity': float(row.get('popularity', 0)) if row.get('popularity') else 0,
                        'embeddings': json.dumps({})  # Embeddings şimdilik boş
                    }
                    
                    batch.append(tv_show)
                    
                    # Batch dolduysa veritabanına yaz
                    if len(batch) >= BATCH_SIZE:
                        inserted = insert_batch(cur, batch)
                        total_inserted += inserted
                        conn.commit()
                        batch = []
                        
                        # İlerleme göster
                        if total_processed % 10000 == 0:
                            print(f"  📊 İşlenen: {total_processed:,} | Eklenen: {total_inserted:,} | Hata: {errors}")
                
                except Exception as e:
                    errors += 1
                    if errors < 10:  # İlk 10 hatayı göster
                        print(f"  ⚠️  Satır {total_processed} hatası: {e}")
                    continue
            
            # Kalan kayıtları ekle
            if batch:
                inserted = insert_batch(cur, batch)
                total_inserted += inserted
                conn.commit()
        
        print("\n" + "=" * 80)
        print("✅ IMPORT TAMAMLANDI!")
        print("=" * 80)
        print(f"📊 Toplam işlenen kayıt: {total_processed:,}")
        print(f"✅ Başarıyla eklenen: {total_inserted:,}")
        print(f"⚠️  Hata sayısı: {errors}")
        print()
        
        # Veritabanı istatistiklerini göster
        print("📈 Veritabanı İstatistikleri:")
        cur.execute("SELECT COUNT(*) FROM media_items WHERE source_type = 'tv'")
        tv_count = cur.fetchone()[0]
        print(f"  • Toplam TV dizisi: {tv_count:,}")
        
        cur.execute("SELECT COUNT(*) FROM media_items WHERE source_type = 'tv' AND original_language = 'en'")
        en_count = cur.fetchone()[0]
        print(f"  • İngilizce diziler: {en_count:,}")
        
        cur.execute("SELECT title, year, popularity FROM media_items WHERE source_type = 'tv' ORDER BY popularity DESC LIMIT 5")
        top_shows = cur.fetchall()
        print(f"\n🔥 En Popüler 5 Dizi:")
        for i, (title, year, pop) in enumerate(top_shows, 1):
            print(f"  {i}. {title} ({year}) - Popülerlik: {pop:.2f}")
        
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()
        print("\n✅ Veritabanı bağlantısı kapatıldı")

def insert_batch(cursor, batch):
    """Batch insert işlemi yapar"""
    if not batch:
        return 0
    
    insert_query = """
        INSERT INTO media_items (id, title, poster_path, year, overview, genres, source_type, original_language, popularity, embeddings)
        VALUES (%(id)s, %(title)s, %(poster_path)s, %(year)s, %(overview)s, %(genres)s, %(source_type)s, %(original_language)s, %(popularity)s, %(embeddings)s)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            poster_path = EXCLUDED.poster_path,
            year = EXCLUDED.year,
            overview = EXCLUDED.overview,
            genres = EXCLUDED.genres,
            popularity = EXCLUDED.popularity,
            updated_at = CURRENT_TIMESTAMP
    """
    
    try:
        psycopg2.extras.execute_batch(cursor, insert_query, batch)
        return len(batch)
    except Exception as e:
        print(f"  ❌ Batch insert hatası: {e}")
        return 0

if __name__ == "__main__":
    print()
    import_tv_shows()
    print()
    print("💡 İpucu: Uygulamayı yeniden başlatın: docker-compose restart backend")
    print()
