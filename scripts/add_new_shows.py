#!/usr/bin/env python3
"""
SimilarHub Incremental Data Import Script
Bu script yeni TV dizilerini mevcut verileri bozmadan ekler.
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
BATCH_SIZE = 500

def parse_year(date_str):
    """Tarih string'inden yıl bilgisini çıkarır"""
    if not date_str or date_str == "":
        return None
    try:
        return int(date_str.split("-")[0])
    except:
        return None

def clean_genres(genres_str):
    """Genres string'ini JSON array'e dönüştürür"""
    if not genres_str or genres_str == "":
        return json.dumps([])
    
    try:
        genres = [g.strip() for g in genres_str.split(",")]
        return json.dumps(genres)
    except:
        return json.dumps([])

def get_existing_ids(cursor):
    """Veritabanındaki mevcut TV show ID'lerini çeker"""
    cursor.execute("SELECT id FROM media_items WHERE source_type = 'tv'")
    return set(row[0] for row in cursor.fetchall())

def import_new_shows_from_csv(csv_file):
    """
    CSV dosyasından sadece yeni dizileri import eder.
    Mevcut dizilere dokunmaz, embeddings'leri korur.
    """
    
    if not DATABASE_URL:
        print("❌ HATA: DATABASE_URL environment değişkeni tanımlı değil!")
        return
    
    if not os.path.exists(csv_file):
        print(f"❌ HATA: CSV dosyası bulunamadı: {csv_file}")
        return
    
    print("=" * 80)
    print("SimilarHub - Incremental TV Dizileri Import Script")
    print("=" * 80)
    print(f"📁 CSV Dosyası: {csv_file}")
    print()
    
    # Veritabanına bağlan
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Veritabanı bağlantısı başarılı")
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {e}")
        return
    
    # Mevcut ID'leri al
    print("📋 Mevcut diziler kontrol ediliyor...")
    existing_ids = get_existing_ids(cur)
    print(f"   Mevcut dizi sayısı: {len(existing_ids):,}")
    
    # CSV dosyasını oku
    print(f"\n📖 CSV dosyası okunuyor...")
    
    batch = []
    total_processed = 0
    total_new = 0
    total_skipped = 0
    total_inserted = 0
    errors = 0
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total_processed += 1
                
                try:
                    show_id = int(row['id'])
                    
                    # Eğer zaten varsa skip et
                    if show_id in existing_ids:
                        total_skipped += 1
                        continue
                    
                    total_new += 1
                    
                    # Yeni veriyi hazırla
                    tv_show = {
                        'id': show_id,
                        'title': row['name'][:500] if row.get('name') else 'Unknown',
                        'poster_path': row.get('poster_path', ''),
                        'year': parse_year(row.get('first_air_date', '')),
                        'overview': row.get('overview', ''),
                        'genres': clean_genres(row.get('genres', '')),
                        'source_type': 'tv',
                        'original_language': row.get('original_language', 'en'),
                        'popularity': float(row.get('popularity', 0)) if row.get('popularity') else 0,
                        'embeddings': json.dumps({})  # Embeddings boş başlar
                    }
                    
                    batch.append(tv_show)
                    
                    # Batch dolduysa veritabanına yaz
                    if len(batch) >= BATCH_SIZE:
                        inserted = insert_batch(cur, batch)
                        total_inserted += inserted
                        conn.commit()
                        batch = []
                        
                        # İlerleme göster
                        if total_new % 5000 == 0:
                            print(f"  📊 İşlenen: {total_processed:,} | Yeni: {total_new:,} | Eklenen: {total_inserted:,} | Atlanan: {total_skipped:,}")
                
                except Exception as e:
                    errors += 1
                    if errors < 10:
                        print(f"  ⚠️  Satır {total_processed} hatası: {e}")
                    continue
            
            # Kalan kayıtları ekle
            if batch:
                inserted = insert_batch(cur, batch)
                total_inserted += inserted
                conn.commit()
        
        print("\n" + "=" * 80)
        print("✅ INCREMENTAL IMPORT TAMAMLANDI!")
        print("=" * 80)
        print(f"📊 Toplam işlenen kayıt: {total_processed:,}")
        print(f"⏭️  Zaten var (atlanan): {total_skipped:,}")
        print(f"🆕 Yeni dizi bulundu: {total_new:,}")
        print(f"✅ Başarıyla eklenen: {total_inserted:,}")
        print(f"⚠️  Hata sayısı: {errors}")
        print()
        
        # Güncel istatistikler
        print("📈 Veritabanı İstatistikleri:")
        cur.execute("SELECT COUNT(*) FROM media_items WHERE source_type = 'tv'")
        tv_count = cur.fetchone()[0]
        print(f"  • Toplam TV dizisi: {tv_count:,}")
        
        cur.execute("SELECT COUNT(*) FROM media_items WHERE source_type = 'tv' AND embeddings::text != '{}'")
        with_embeddings = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM media_items WHERE source_type = 'tv' AND embeddings::text = '{}'")
        without_embeddings = cur.fetchone()[0]
        print(f"  • Embedding'li diziler: {with_embeddings:,}")
        print(f"  • Embedding bekleyen: {without_embeddings:,}")
        
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()
        print("\n✅ Veritabanı bağlantısı kapatıldı")

def insert_batch(cursor, batch):
    """Batch insert işlemi yapar - sadece yeni kayıtları ekler"""
    if not batch:
        return 0
    
    insert_query = """
        INSERT INTO media_items (id, title, poster_path, year, overview, genres, source_type, original_language, popularity, embeddings)
        VALUES (%(id)s, %(title)s, %(poster_path)s, %(year)s, %(overview)s, %(genres)s, %(source_type)s, %(original_language)s, %(popularity)s, %(embeddings)s)
        ON CONFLICT (id) DO NOTHING
    """
    
    try:
        psycopg2.extras.execute_batch(cursor, insert_query, batch)
        return len(batch)
    except Exception as e:
        print(f"  ❌ Batch insert hatası: {e}")
        return 0

def import_from_dict_list(shows_list):
    """
    Python dict listesinden doğrudan import eder.
    
    Args:
        shows_list: List of dicts with keys: id, name, first_air_date, overview, 
                    genres (comma-separated str), poster_path, original_language, popularity
    
    Returns:
        (total_inserted, total_skipped, errors)
    """
    if not DATABASE_URL:
        print("❌ HATA: DATABASE_URL environment değişkeni tanımlı değil!")
        return (0, 0, 1)
    
    print("=" * 80)
    print("SimilarHub - Incremental Import (From Dict)")
    print("=" * 80)
    print(f"📥 {len(shows_list)} dizi import edilecek")
    print()
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Veritabanı bağlantısı başarılı")
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {e}")
        return (0, 0, 1)
    
    # Mevcut ID'leri al
    existing_ids = get_existing_ids(cur)
    print(f"📋 Mevcut dizi sayısı: {len(existing_ids):,}\n")
    
    batch = []
    total_inserted = 0
    total_skipped = 0
    errors = 0
    
    try:
        for idx, show in enumerate(shows_list, 1):
            try:
                show_id = int(show['id'])
                
                if show_id in existing_ids:
                    total_skipped += 1
                    continue
                
                tv_show = {
                    'id': show_id,
                    'title': show.get('name', 'Unknown')[:500],
                    'poster_path': show.get('poster_path', ''),
                    'year': parse_year(show.get('first_air_date', '')),
                    'overview': show.get('overview', ''),
                    'genres': clean_genres(show.get('genres', '')),
                    'source_type': 'tv',
                    'original_language': show.get('original_language', 'en'),
                    'popularity': float(show.get('popularity', 0)) if show.get('popularity') else 0,
                    'embeddings': json.dumps({})
                }
                
                batch.append(tv_show)
                
                if len(batch) >= BATCH_SIZE:
                    inserted = insert_batch(cur, batch)
                    total_inserted += inserted
                    conn.commit()
                    batch = []
            
            except Exception as e:
                errors += 1
                if errors < 10:
                    print(f"  ⚠️  Dizi {idx} hatası: {e}")
        
        # Kalan kayıtları ekle
        if batch:
            inserted = insert_batch(cur, batch)
            total_inserted += inserted
            conn.commit()
        
        print("=" * 80)
        print("✅ IMPORT TAMAMLANDI!")
        print("=" * 80)
        print(f"✅ Yeni eklenen: {total_inserted}")
        print(f"⏭️  Zaten var (atlanan): {total_skipped}")
        print(f"⚠️  Hata: {errors}")
        
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        conn.rollback()
        return (total_inserted, total_skipped, 1)
    
    finally:
        cur.close()
        conn.close()
    
    return (total inserted, total_skipped, errors)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Kullanım:")
        print("  python add_new_shows.py <csv_dosyası>")
        print()
        print("Örnek:")
        print("  python add_new_shows.py /app/database/new_shows.csv")
        print("  python add_new_shows.py /app/database/TMDB_tv_dataset.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    import_new_shows_from_csv(csv_file)
    
    print()
    print("💡 İpucu: Yeni diziler için embedding oluşturmak için:")
    print("   python scripts/process_embeddings.py")
    print()
