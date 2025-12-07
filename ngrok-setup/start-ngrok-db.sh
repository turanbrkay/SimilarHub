#!/bin/bash

# SimilarHub Database ngrok Tunnel Başlatma Script'i
# Database için TCP tunnel oluşturur

echo "🔒 PostgreSQL Database ngrok Tunnel Başlatılıyor..."
echo ""

# Güvenlik uyarısı
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  GÜVENLİK UYARISI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Database'i internete açmak güvenlik riski taşır!"
echo ""
echo "Öneriler:"
echo "  1. Read-only user oluşturun"
echo "  2. Sadece güvendiğiniz kişilerle paylaşın"
echo "  3. Test bitince tunnel'ı durdurun"
echo ""
read -p "Devam etmek istediğinize emin misiniz? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ İptal edildi."
    exit 1
fi

# ngrok kurulu mu kontrol et
NGROK_CMD="ngrok"
if ! command -v ngrok &> /dev/null; then
    if [ -f "./ngrok" ]; then
        NGROK_CMD="./ngrok"
    else
        echo "❌ ngrok kurulu değil!"
        echo "Kurulum için: brew install ngrok/ngrok/ngrok"
        exit 1
    fi
fi

# Docker container çalışıyor mu kontrol et
if ! docker ps | grep -q similarhub-db; then
    echo "❌ Database container çalışmıyor!"
    echo "Başlatmak için: docker-compose up -d db"
    exit 1
fi

# Database bağlantısını test et
echo ""
echo "🔍 Database bağlantısı test ediliyor..."
if docker exec similarhub-db pg_isready -U postgres -d similarhub > /dev/null 2>&1; then
    echo "✅ Database hazır!"
else
    echo "❌ Database bağlantısı kurulamadı!"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 Database için ngrok TCP tunnel açılıyor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Arkadaşlarınız şu bilgilerle bağlanabilir:"
echo ""
echo "   Host: (ngrok tarafından verilecek)"
echo "   Port: (ngrok tarafından verilecek)"
echo "   Database: similarhub"
echo "   User: postgres"
echo "   Password: .env dosyasındaki şifre"
echo ""
echo "⚠️  Durdurmak için: CTRL+C"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ngrok'u başlat (port 5433 - docker-compose.yml'deki external port)
$NGROK_CMD tcp 5433 \
    --log=stdout \
    --log-level=info \
    --region=eu
