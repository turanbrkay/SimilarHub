# 🚀 ngrok Kurulum Adımları

## Durum Kontrolü

✅ Docker container'lar çalışıyor:
- `similarhub-db` - Hazır ve sağlıklı
- `similarhub-backend` - Çalışıyor

⚠️ ngrok henüz kurulu değil

---

## Adım 1: ngrok Kurulumu

### macOS için (Homebrew):

```bash
# ngrok'u kur
brew install ngrok/ngrok/ngrok
```

### Alternatif Kurulum (Homebrew yoksa):

```bash
# ngrok'u indir
curl -O https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip

# Zip'i aç
unzip ngrok-v3-stable-darwin-amd64.zip

# Sistem path'e taşı
sudo mv ngrok /usr/local/bin/

# Yetki ver
chmod +x /usr/local/bin/ngrok

# Kontrol et
ngrok version
```

---

## Adım 2: ngrok Hesabı ve Token

1. **Hesap Oluştur**: [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
   - Google, GitHub veya email ile kayıt olabilirsiniz
   - Ücretsiz hesap yeterli!

2. **Token'ı Al**:
   - Login olduktan sonra: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
   - "Your Authtoken" bölümünden token'ı kopyalayın

3. **Token'ı Yapılandır**:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```
   
   Örnek:
   ```bash
   ngrok config add-authtoken 2abc123DEFghiJKLmnoPQRst4uvwXYZ_5abcDEFgh6ijKLMN
   ```

---

## Adım 3: İlk Tunnel'ı Başlat

### Otomatik Script ile (Önerilen):

```bash
cd /Users/mac/Desktop/SimilarHub/ngrok-setup
./start-ngrok.sh
```

### Manuel olarak:

```bash
# SimilarHub çalışıyor mu kontrol et
docker-compose ps

# Frontend çalışıyorsa ngrok başlat
ngrok http 5173
```

---

## Adım 4: URL'yi Paylaş

Terminal'de şöyle bir çıktı göreceksiniz:

```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        Europe (eu)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:5173

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Public URL'niz:** `https://abc123.ngrok.io`

Bu URL'yi arkadaşlarınızla paylaşın! 🎉

---

## Adım 5: Test Edin

Tarayıcınızda ngrok URL'sini açın:
```
https://abc123.ngrok.io
```

SimilarHub anasayfasını görmelisiniz! ✅

---

## Ek: ngrok Web Inspector

Tunnel açıkken, tüm istekleri görmek için:

```
http://localhost:4040
```

Bu sayfada:
- Gelen tüm HTTP istekleri
- Request/Response detayları
- Replay özelliği

---

## Sorun Giderme

### "command not found: ngrok"
```bash
# PATH'e eklenmiş mi kontrol et
echo $PATH

# Manuel olarak çalıştır
/usr/local/bin/ngrok http 5173
```

### "authentication failed"
```bash
# Token'ı yeniden ekle
ngrok config add-authtoken YOUR_TOKEN

# Config dosyasını kontrol et
cat ~/.config/ngrok/ngrok.yml
```

### "failed to listen on port 5173"
```bash
# Frontend çalışıyor mu?
docker-compose ps | grep frontend

# Port'u kontrol et
lsof -i :5173

# Frontend'i başlat
docker-compose up -d frontend
```

---

## Sonraki Adımlar

Kurulum tamamlandıktan sonra:

1. ✅ Frontend tunnel çalışıyor
2. 🔒 Database paylaşmak isterseniz: `./create-readonly-user.sh`
3. 🔐 Database tunnel: `./start-ngrok-db.sh`
4. 🛑 Durdurmak için: `./stop-ngrok.sh`

---

## Önemli Notlar

> [!WARNING]
> **Ücretsiz Plan Limitleri:**
> - Her oturum 2 saat (sonra yeniden başlatın)
> - Her başlatmada farklı URL
> - 40 bağlantı/dakika limiti
> - Bandwidth limiti: ~1GB/ay

> [!TIP]
> **Test için ipuçları:**
> - Tunnel'ı test ederken Web Inspector kullanın
> - URL'yi sadece test için gerekli kişilerle paylaşın
> - İş bitince mutlaka durdurun

---

Hazırsanız şimdi kuruluma başlayabilirsiniz! 🚀
