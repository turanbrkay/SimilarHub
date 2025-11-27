# 📂 Proje Dosya Yapısı ve Açıklamaları

Bu doküman, SimilarHub projesindeki her bir dosya ve klasörün ne işe yaradığını açıklar.

## 🏗️ Ana Dizin

| Dosya / Klasör | Açıklama |
|----------------|----------|
| `backend/` | Backend (Python/Flask) kodlarını içeren klasör. |
| `frontend/` | Frontend (React) kodlarını içeren klasör. |
| `nginx/` | Production Nginx konfigürasyonlarını içeren klasör. |
| `scripts/` | Yardımcı scriptleri (import, update, backup) içeren klasör. |
| `docs/` | Dokümantasyon dosyalarını içeren klasör. |
| `database/` | Veritabanı şeması ve veri dosyalarını içeren klasör. |
| `embeddings/` | Yapay zeka modellerini içeren klasör. |
| `docker-compose.yml` | **Local Geliştirme**: Projeyi kendi bilgisayarınızda (dev modunda) çalıştırmak için gerekli Docker servislerini tanımlar. |
| `docker-compose.prod.yml` | **Production (Canlı)**: Projeyi sunucuda veya canlı ortamda çalıştırmak için gerekli ayarları (SSL, Restart Policy) içerir. |
| `.env` | **Gizli Ayarlar**: Veritabanı şifreleri, API anahtarları gibi hassas bilgileri tutar. (Git'e atılmaz!) |
| `.env.example` | `.env` dosyasının şablonudur. Git'e atılır. |
| `.gitignore` | Git'e yüklenmemesi gereken dosyaları (büyük dosyalar, şifreler) belirtir. |
| `README.md` | Projenin kullanım kılavuzu. |

## 🐍 Backend (`backend/`)

Python Flask ile yazılmış API sunucusu.

| Dosya | Açıklama |
|-------|----------|
| `app.py` | **Ana Uygulama**: API endpointlerini, veritabanı bağlantılarını ve benzerlik mantığını yönetir. |
| `requirements.txt` | Gerekli Python kütüphanelerinin listesi. |
| `Dockerfile` | Backend uygulamasının Docker imajını oluşturur. |

## 🎨 Frontend (`frontend/`)

React ile geliştirilen kullanıcı arayüzü.

| Dosya / Klasör | Açıklama |
|----------------|----------|
| `src/` | Kaynak kodlar (Sayfalar, bileşenler). |
| `public/` | Statik dosyalar. |
| `package.json` | JavaScript kütüphanelerinin listesi. |
| `vite.config.ts` | Vite derleme ayarları. |
| `Dockerfile` | Frontend uygulamasının Docker imajını oluşturur. |
| `nginx.conf` | **Dev Nginx**: Geliştirme ortamı için basit Nginx ayarı. |

## ⚙️ Scripts (`scripts/`)

Proje yönetimini kolaylaştıran araçlar.

| Dosya | Açıklama |
|-------|----------|
| `import_data.py` | CSV dosyasındaki verileri veritabanına yükler. |
| `update.sh` | Git'ten güncellemeleri çeker ve Docker'ı yeniden başlatır. |
| `backup.sh` | Veritabanının yedeğini alır. |

## 🌐 Nginx (`nginx/`)

Production ortamı için sunucu ayarları.

| Dosya | Açıklama |
|-------|----------|
| `nginx.prod.conf` | **Prod Nginx**: SSL (HTTPS) ve Proxy ayarlarını içerir. |

## 📚 Docs (`docs/`)

Proje dokümantasyonu.

| Dosya | Açıklama |
|-------|----------|
| `DEPLOYMENT.md` | Canlıya alma ve sunucu kurulum rehberi. |
| `PROJECT_STRUCTURE.md` | Bu dosya. |

## 🗄️ Database (`database/`)

| Dosya | Açıklama |
|-------|----------|
| `init.sql` | Veritabanı tablolarını oluşturan SQL scripti. |
| `TMDB_tv_dataset.csv` | **Ham Veri**: TV dizilerinin bulunduğu büyük veri dosyası. (Git'e atılmaz) |

## 🧠 Embeddings (`embeddings/`)

| Dosya | Açıklama |
|-------|----------|
| `bm25_overview.pkl` | **AI Modeli**: Dizi özetleri arasındaki metin benzerliğini hesaplayan model. (Git'e atılmaz) |
