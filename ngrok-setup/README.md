# ngrok ile SimilarHub Paylaşımı - Komple Rehber

## 📚 İçindekiler

Bu klasördeki dosyalar:

### 📖 Dokümantasyon
- **[QUICK_START.md](./QUICK_START.md)** - 5 dakikada başlat (önceden ngrok kurduysan)
- **[INSTALLATION.md](./INSTALLATION.md)** - Adım adım ngrok kurulumu (ilk kez kuruyorsan)
- **[README.md](./README.md)** - Detaylı kullanım kılavuzu

### 🔧 Script'ler
- **`start-ngrok.sh`** - Frontend tunnel başlat
- **`start-ngrok-db.sh`** - Database tunnel başlat (opsiyonel)
- **`stop-ngrok.sh`** - Tüm tunnel'ları durdur
- **`create-readonly-user.sh`** - Güvenli database user oluştur

---

## 🎯 Ne Yapmak İstiyorsun?

### Senaryo 1: İlk Kez Kullanıyorum

1. ➡️ [INSTALLATION.md](./INSTALLATION.md) - ngrok kurulumunu yap
2. ➡️ [QUICK_START.md](./QUICK_START.md) - Tunnel başlat

### Senaryo 2: ngrok Zaten Kurulu

➡️ [QUICK_START.md](./QUICK_START.md) - Direkt başla

### Senaryo 3: Sadece Frontend Paylaşacağım

```bash
./start-ngrok.sh
```

### Senaryo 4: Database'i de Paylaşmak İstiyorum

```bash
# Önce güvenli user oluştur
./create-readonly-user.sh

# Sonra tunnel başlat
./start-ngrok-db.sh
```

### Senaryo 5: Her Şeyi Durdurmak İstiyorum

```bash
./stop-ngrok.sh
```

---

## 🚦 Durum Kontrolü

Şu anda:
- ✅ Docker container'lar çalışıyor
- ⚠️ ngrok kurulu değil → [INSTALLATION.md](./INSTALLATION.md)

---

## ⚡ En Hızlı Başlangıç

```bash
# 1. ngrok kur
brew install ngrok/ngrok/ngrok

# 2. Token ekle (https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken YOUR_TOKEN

# 3. Tunnel başlat
./start-ngrok.sh

# 4. URL'yi arkadaşlarınla paylaş!
```

---

## 🆘 Yardım

Sorunlarla karşılaşırsan:

1. **ngrok kurulu mu?**
   ```bash
   which ngrok
   ngrok version
   ```

2. **SimilarHub çalışıyor mu?**
   ```bash
   docker-compose ps
   ```

3. **Frontend erişilebilir mi?**
   ```bash
   curl http://localhost:5173
   ```

Detaylı troubleshooting için: [README.md](./README.md)

---

## 📞 İletişim

- ngrok Dokümantasyonu: https://ngrok.com/docs
- ngrok Dashboard: https://dashboard.ngrok.com

---

**Başarılar! 🚀**
