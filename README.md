# 🎬 SimilarHub - TV Dizi Öneri Sistemi

Bu proje, yapay zeka kullanarak sevdiğin dizilere benzer yeni diziler bulmanı sağlar.

## 🚀 Nasıl Çalıştırı## 📊 Veri Yükleme (İlk Kurulum)

Projeyi ilk kez kurduktan sonra, veritabanı boş olacaktır. TV dizi verilerini yüklemek için:

### Docker İçinden (Önerilen)

```bash
# Backend container'ında import scriptini çalıştır
docker-compose exec backend python scripts/import_data.py
```

### Manuel Import (Geliştiriciler İçin)

Eğer Docker kullanmadan import etmek isterseniz:

```bash
# Python ve gerekli kütüphaneleri yükle
pip install psycopg2-binary python-dotenv

# .env dosyasında DATABASE_URL'in localhost'u gösterdiğinden emin olun
# DATABASE_URL=postgresql://similarhub_user:şifre@localhost:5432/similarhub_db

# Import scriptini çalıştır
python scripts/import_data.py
```

### Import Süreci

Import scripti şunları yapar:
- `database/TMDB_tv_dataset.csv` dosyasından ~216,000 TV dizisini okur
- Verileri temizleyip PostgreSQL formatına dönüştürür
- Batch insert ile veritabanına yazar (performans için)
- İlerleme durumunu gösterir

**Beklenen Süre**: ~2-5 dakika (bilgisayar hızına bağlı)

### Import Sonrası

Import tamamlandıktan sonra backend'i yeniden başlatın:

```bash
docker-compose restart backend
docker-compose up -d
```

Artık uygulamaya `http://localhost` adresinden erişip dizileri arayabilirsiniz!

## 📱 Kullanım

### Ana Sayfa
1. Arama çubuğuna bir dizi adı yazın (örn: "Breaking Bad")
2. Açılan listeden istediğiniz diziyi seçin
3. Sistem sizin için benzer dizileri listeler

### Benzerlik Ağırlıklarını Ayarlama
- "Similar Shows" sayfasında sağ taraftaki ayarlar panelinden ağırlıkları değiştirebilirsiniz
- Her faktörün (türler, özet, oyuncular, vb.) önem derecesini ayarlayın
- "Apply Weights" butonuna tıklayarak yeni sonuçları görün

### Diğer Önerilen Dizilere Bakma
- Önerilen dizilerin üzerine tıklayarak onların benzer dizilerini de görebilirsiniz

## 🛠️ Geliştirme Modu

### Backend'i Geliştirme Modunda Çalıştırma

```bash
cd backend

# Virtual environment oluştur
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# NLTK verilerini indir
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt')"

# .env dosyasında DATABASE_URL'yi local için ayarla
# DATABASE_URL=postgresql://kullanıcı:şifre@localhost:5432/similarhub_db

# Flask'ı başlat
python app.py
```

Backend http://localhost:5000 adresinde çalışacaktır.

### Frontend'i Geliştirme Modunda Çalıştırma

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Development server'ı başlat
npm run dev
```

Frontend http://localhost:5173 adresinde çalışacaktır.

## 🗂️ Proje Yapısı

```
SimilarHub-2/
├── backend/                 # Backend kodları
│   ├── app.py              # Flask uygulaması
│   ├── requirements.txt    # Python bağımlılıkları
│   └── Dockerfile          # Backend Docker imajı
│
├── frontend/                # Frontend kodları
│   ├── src/                # React kaynak kodları
│   ├── public/             # Statik dosyalar
│   ├── package.json        # Node bağımlılıkları
│   ├── vite.config.ts      # Vite yapılandırması
│   ├── Dockerfile          # Frontend Docker imajı
│   └── nginx.conf          # Dev Nginx ayarı
│
├── nginx/                   # Production Nginx ayarları
│   └── nginx.prod.conf     # SSL ve Proxy ayarları
│
├── scripts/                 # Yardımcı scriptler
│   ├── import_data.py      # Veri yükleme
│   ├── update.sh           # Otomatik güncelleme
│   └── backup.sh           # Veritabanı yedekleme
│
├── docs/                    # Dokümantasyon
│   ├── DEPLOYMENT.md       # Canlıya alma rehberi
│   └── PROJECT_STRUCTURE.md # Proje yapısı detayı
│
├── database/                # Veritabanı dosyaları
│   ├── init.sql            # Başlangıç şeması
│   └── TMDB_tv_dataset.csv # Veri seti (Git'e atılmaz)
│
├── embeddings/              # AI Modelleri
│   └── bm25_overview.pkl   # BM25 modeli (Git'e atılmaz)
│
├── docker-compose.yml       # Dev ortamı Docker ayarları
├── docker-compose.prod.yml  # Prod ortamı Docker ayarları
├── .env                     # Gizli ayarlar (Git'e atılmaz)
└── README.md                # Bu dosya
```

**Soru: Arama yapıyorum ama sonuç çıkmıyor?**
Cevap: Adım 3'ü (Verileri Yükle) yaptığından emin ol. Eğer yaptıysan Adım 4'ü (Sistemi Yenile) yap.