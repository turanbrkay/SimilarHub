# 🚀 SimilarHub Canlıya Alma Rehberi (Deployment)

Bu rehber, SimilarHub projesini bir sunucuda (VPS) canlıya almak, domain bağlamak ve HTTPS (SSL) kurulumu yapmak için adım adım talimatlar içerir.

## 1. Sunucu Kiralama ve Hazırlık

### Sunucu Gereksinimleri
- **OS**: Ubuntu 22.04 veya 24.04 (LTS)
- **RAM**: En az 2GB (4GB önerilir - FAISS ve Postgres için)
- **Disk**: 25GB+ SSD

### Önerilen Sağlayıcılar
- DigitalOcean (Droplet)
- Hetzner (Cloud)
- AWS (EC2)

### Sunucuya Bağlanma
Terminalden sunucunuza bağlanın:
```bash
ssh root@sunucu_ip_adresi
```

### Temel Kurulumlar
Sunucuyu güncelleyin ve gerekli araçları kurun:

```bash
# Sistemi güncelle
apt update && apt upgrade -y

# Git ve Docker için gerekli paketler
apt install -y git curl apt-transport-https ca-certificates software-properties-common

# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose kurulumu (Docker ile birlikte gelir ama kontrol edelim)
docker compose version
```

## 2. Projeyi Sunucuya Çekme

```bash
# Projeyi klonla
git clone https://github.com/kullaniciadi/SimilarHub-2.git
cd SimilarHub-2
```

> **Önemli**: `.gitignore` nedeniyle `database/TMDB_tv_dataset.csv` ve `embeddings/bm25_overview.pkl` dosyaları gelmeyecektir. Bu dosyaları `scp` veya `SFTP` (FileZilla) ile sunucuya yüklemelisiniz.

```bash
# Yerel bilgisayarınızdan sunucuya dosya gönderme örneği (Terminalden):
scp database/TMDB_tv_dataset.csv root@sunucu_ip_adresi:/root/SimilarHub-2/database/
scp embeddings/bm25_overview.pkl root@sunucu_ip_adresi:/root/SimilarHub-2/embeddings/
```

## 3. Domain Ayarları

1. Domain sağlayıcınızın (GoDaddy, Namecheap vb.) paneline gidin.
2. **DNS Yönetimi** sayfasına girin.
3. Bir **A Kaydı (A Record)** ekleyin:
   - **Host/Name**: `@` (veya `www`)
   - **Value/Target**: Sunucunuzun IP adresi
   - **TTL**: Otomatik veya 1 saat

## 4. SSL Sertifikası (HTTPS) Kurulumu

HTTPS için ücretsiz Let's Encrypt sertifikası alacağız.

### Adım 1: Konfigürasyon Düzenleme
`nginx.prod.conf` dosyasını açın ve `example.com` yazan yerleri kendi domaininizle değiştirin:

```bash
nano nginx.prod.conf
```
*(Ctrl+X, sonra Y, sonra Enter ile kaydedip çıkın)*

### Adım 2: Geçici Sertifika Alma
İlk çalıştırmada Nginx'in hata vermemesi için önce HTTP üzerinden sertifika almalıyız.

1. `docker-compose.prod.yml` dosyasını kullanarak sadece Nginx'i başlatın (ama önce SSL kısmını yorum satırı yapmanız gerekebilir, ya da daha kolayı: Certbot'u standalone çalıştırıp sertifikayı almak).

**En Kolay Yöntem (Certbot Standalone):**
Önce 80 portunu boşaltın (eğer bir şey çalışıyorsa). Sonra sertifikayı alın:

```bash
# Certbot'u çalıştır (Domain adınızı yazın)
docker run -it --rm --name certbot \
            -v "$PWD/certbot/conf:/etc/letsencrypt" \
            -v "$PWD/certbot/www:/var/www/certbot" \
            -p 80:80 \
            certbot/certbot certonly --standalone -d example.com -d www.example.com
```

E-posta adresinizi girin ve şartları kabul edin. "Successfully received certificate" mesajını görünce sertifikalarınız `certbot/conf` klasörüne inmiş demektir.

## 5. Uygulamayı Başlatma

Artık sertifikalarımız var, uygulamayı production modunda başlatabiliriz.

1. `.env` dosyasını oluşturun:
   ```bash
   cp .env.example .env
   nano .env
   ```
   - `APP_ENV=production` yapın.
   - Şifreleri güçlü bir şeyle değiştirin.
   - `DATABASE_URL`'i güncelleyin (değişken kullanmadan, hardcoded olarak).

2. Uygulamayı başlatın:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. Verileri yükleyin (İlk kurulumda):
   ```bash
   docker compose -f docker-compose.prod.yml exec backend python import_data.py
   ```
   
4. Backend'i yeniden başlatın:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

## 6. Alternatif: Bu Bilgisayardan Yayınlama (VPS Olmadan)

Eğer sunucu kiralamak istemiyor ve projeyi **kendi bilgisayarınızdan** dünyaya açmak istiyorsanız, **Cloudflare Tunnel** en iyi yöntemdir.

### Avantajları
- Port açmaya (Port Forwarding) gerek yok.
- Statik IP gerekmez.
- Ücretsiz HTTPS (SSL) sertifikası sağlar.
- Bilgisayarınızın IP adresi gizli kalır.

### Kurulum Adımları

1. **Cloudflare Hesabı Açın**: [dash.cloudflare.com](https://dash.cloudflare.com) adresinden hesap oluşturun.
2. **Domain Ekleyin**: Satın aldığınız domaini Cloudflare'e ekleyin.
3. **Tunnel Oluşturun**:
   - Sol menüden **Zero Trust** > **Networks** > **Tunnels** yolunu izleyin.
   - "Create a Tunnel" deyin.
   - "Cloudflared" seçeneğini seçin.
   - İşletim sistemi olarak "Docker"ı seçin.
   - Size verilen `docker run ...` ile başlayan komutu kopyalayın.

4. **Projeyi Başlatın**:
   Önce projeyi normal şekilde başlatın:
   ```bash
   docker-compose up -d
   ```

5. **Tüneli Bağlayın**:
   Kopyaladığınız Cloudflare komutunu terminale yapıştırın. Bu komut, bilgisayarınız ile Cloudflare arasında güvenli bir köprü kurar.

6. **Yönlendirme Ayarı (Public Hostname)**:
   - Cloudflare panelinde Tunnel ayarlarında "Public Hostname" sekmesine gelin.
   - **Domain**: `similarhub.com` (kendi domaininiz)
   - **Service**: `http://localhost:80`
   - Kaydedin.

Artık `https://similarhub.com` adresine giren herkes, sizin bilgisayarınızda çalışan projeye erişebilir!

> **Not**: Bu yöntemde bilgisayarınız açık olduğu sürece site yayında olur. Bilgisayarı kapatırsanız site kapanır.

---

## Sorun Giderme

**Nginx Başlamıyor (SSL Hatası)**
- Sertifikaların doğru path'te olduğundan emin olun: `./certbot/conf/live/example.com/fullchain.pem`
- `nginx.prod.conf` dosyasındaki domain adının sertifikadakiyle aynı olduğundan emin olun.

**Veritabanı Bağlanmıyor**
- `.env` dosyasındaki şifre ile `docker-compose.prod.yml` içindeki şifrenin uyuştuğundan emin olun.
- `DATABASE_URL` formatını kontrol edin.
