# 🎬 SimilarHub - TV Dizi Öneri Sistemi

Bu proje, yapay zeka kullanarak sevdiğin dizilere benzer yeni diziler bulmanı sağlar.

## 🚀 Hızlı Başlangıç (Docker)

Projeyi en kolay şekilde ayağa kaldırmak için Docker kullanın.

### 1. Servisleri Başlatın

Terminalde proje ana dizininde şu komutu çalıştırın:

```bash
docker-compose up -d --build
```

Bu komut veritabanı, backend ve frontend servislerini hazırlar ve başlatır.

### 2. Veri Yükleme (Sadece İlk Kurulum)

Projeyi ilk kez çalıştırıyorsanız veritabanı boştur. Dizi verilerini yüklemek için:

```bash
docker-compose exec backend python scripts/import_data.py
```

> ⏳ **Not:** Bu işlem bilgisayar hızına bağlı olarak 2-5 dakika sürebilir. İşlem bitene kadar bekleyin.

### 3. Uygulamaya Erişim

Veri yükleme tamamlandıktan sonra:

- **Frontend (Uygulama):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

adreslerinden erişebilirsiniz.

---

## 🛠️ Sorun Giderme

### Frontend Açılmıyor / Permission Denied Hatası
Eğer frontend container'ı sürekli restart atıyorsa veya "permission denied" hatası görüyorsanız:

```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Arama Sonuç Vermiyor
Eğer arama yaptığınızda sonuç gelmiyorsa, **Adım 2**'deki veri yükleme işlemini yaptığınızdan emin olun.

## 🗂️ Proje Yapısı

```
SimilarHub/
├── backend/                 # Python/Flask API
├── frontend/                # React/Vite Uygulaması
├── database/                # Veritabanı şemaları ve veri seti
├── embeddings/              # AI Modelleri
├── scripts/                 # Yardımcı araçlar (import, backup vb.)
└── docker-compose.yml       # Docker konfigürasyonu
```