#!/bin/bash

# SimilarHub ngrok Tunnel Başlatma Script'i
# Frontend için public URL oluşturur

echo "🚀 SimilarHub ngrok Tunnel Başlatılıyor..."
echo ""

# ngrok kurulu mu kontrol et
NGROK_CMD="ngrok"
if ! command -v ngrok &> /dev/null; then
    if [ -f "./ngrok" ]; then
        echo "✅ Local ngrok bulundu."
        NGROK_CMD="./ngrok"
    else
        echo "❌ ngrok kurulu değil!"
        echo ""
        echo "Kurulum için:"
        echo "  macOS: brew install ngrok/ngrok/ngrok"
        echo "  Veya manuel: https://ngrok.com/download"
        exit 1
    fi
fi

# Docker container çalışıyor mu kontrol et
if ! docker ps | grep -q similarhub-frontend; then
    echo "⚠️  SimilarHub container'ları çalışmıyor!"
    echo ""
    echo "Başlatmak için:"
    echo "  cd /Users/mac/Desktop/SimilarHub"
    echo "  docker-compose up -d"
    echo ""
    read -p "Şimdi başlatmak ister misiniz? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CURRENT_DIR=$(pwd)
        cd /Users/mac/Desktop/SimilarHub
        docker-compose up -d
        cd "$CURRENT_DIR"
        echo "⏳ Container'lar başlatılıyor... 10 saniye bekleniyor..."
        sleep 10
    else
        exit 1
    fi
fi

# Frontend'in çalıştığını kontrol et
echo "🔍 Frontend durumu kontrol ediliyor..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend hazır!"
else
    echo "⚠️  Frontend henüz hazır değil. 5 saniye daha bekleniyor..."
    sleep 5
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 Frontend için ngrok tunnel açılıyor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Tunnel başladığında size bir PUBLIC URL verilecek."
echo "📌 Bu URL'yi arkadaşlarınızla paylaşabilirsiniz!"
echo ""
echo "⚠️  Durdurmak için: CTRL+C veya ./stop-ngrok.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ngrok'u başlat
$NGROK_CMD http 5173 \
    --log=stdout \
    --log-level=info \
    --region=eu
