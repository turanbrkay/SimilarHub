#!/bin/bash

# Tüm ngrok tunnel'larını durdur

echo "🛑 Tüm ngrok tunnel'ları durduruluyor..."
echo ""

# ngrok process'lerini bul ve durdur
NGROK_PIDS=$(pgrep ngrok)

if [ -z "$NGROK_PIDS" ]; then
    echo "ℹ️  Çalışan ngrok process'i bulunamadı."
else
    echo "📍 Bulunan ngrok process'leri:"
    ps aux | grep ngrok | grep -v grep
    echo ""
    
    for PID in $NGROK_PIDS; do
        echo "🔪 Process durdurluyor: PID $PID"
        kill $PID
    done
    
    echo ""
    echo "✅ Tüm ngrok tunnel'ları durduruldu!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ℹ️  Not: SimilarHub container'ları hala çalışıyor."
echo ""
echo "Container'ları durdurmak için:"
echo "  cd /Users/mac/Desktop/SimilarHub"
echo "  docker-compose down"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
