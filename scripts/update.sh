#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 SimilarHub Güncelleme Başlatılıyor...${NC}"

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# 1. Kodları Çek
echo -e "\n${GREEN}📥 Git üzerinden güncellemeler çekiliyor...${NC}"
git pull

# 2. Containerları Yeniden Oluştur (Cache kullanmadan build et ki yeni kodları alsın)
echo -e "\n${GREEN}🐳 Docker container'ları yeniden derleniyor...${NC}"
# Production modunda mı yoksa dev modunda mı çalıştığını kontrol et
if [ -f "docker-compose.prod.yml" ] && [ -f ".env" ] && grep -q "APP_ENV=production" .env; then
    echo "   -> Production modu algılandı."
    docker compose -f docker-compose.prod.yml up -d --build
else
    echo "   -> Development modu algılandı."
    docker compose up -d --build
fi

# 3. Gereksiz İmajları Temizle
echo -e "\n${GREEN}🧹 Temizlik yapılıyor...${NC}"
docker image prune -f

echo -e "\n${GREEN}✅ Güncelleme Tamamlandı!${NC}"
echo -e "Backend loglarını kontrol etmek için: docker compose logs -f backend"
