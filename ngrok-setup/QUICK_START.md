# ⚡ Hızlı Başlangıç - 5 Dakikada ngrok

## 1️⃣ ngrok Kur ve Yapılandır

```bash
# macOS
brew install ngrok/ngrok/ngrok

# Token ekle (https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

## 2️⃣ SimilarHub'ı Başlat

```bash
cd /Users/mac/Desktop/SimilarHub
docker-compose up -d
```

## 3️⃣ Tunnel Aç

```bash
cd ngrok-setup
chmod +x *.sh
./start-ngrok.sh
```

## 4️⃣ URL'yi Paylaş

Terminal'de görünen URL'yi kopyalayıp arkadaşlarınla paylaş:

```
Forwarding: https://abc123.ngrok.io -> http://localhost:5173
```

✅ Arkadaşların şimdi `https://abc123.ngrok.io` adresinden erişebilir!

---

## 🛑 Durdurmak için

```bash
# Yeni terminal aç
cd /Users/mac/Desktop/SimilarHub/ngrok-setup
./stop-ngrok.sh
```

---

## 📊 Database Paylaşımı (Opsiyonel)

**Güvenli yöntem:**

```bash
# 1. Read-only user oluştur
./create-readonly-user.sh

# 2. Database tunnel aç
./start-ngrok-db.sh
```

Arkadaşların bağlantı bilgileri:
- **Host:** ngrok'un verdiği TCP adresi
- **Port:** ngrok'un verdiği port
- **Database:** similarhub
- **User:** readonly
- **Password:** script'te belirlediğiniz şifre

---

## ❓ Sorun mu var?

```bash
# ngrok çalışıyor mu?
ngrok diagnose

# SimilarHub çalışıyor mu?
docker-compose ps

# Frontend erişilebilir mi?
curl http://localhost:5173
```

Detaylı bilgi için: [README.md](./README.md)
