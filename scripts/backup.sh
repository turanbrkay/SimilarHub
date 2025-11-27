#!/bin/bash

# Ayarlar
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="similarhub_backup_$TIMESTAMP.sql"

# Renkler
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}📦 Veritabanı yedeği alınıyor...${NC}"

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# Backup klasörünü oluştur
mkdir -p $BACKUP_DIR

# Docker içinden pg_dump çalıştır
# Production veya Dev ortamına göre container ismini bulmaya çalışırız ama
# docker-compose.yml ve prod.yml'da container_name: movies-db sabittir.
docker exec movies-db pg_dump -U similarhub_user similarhub_db > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Yedek başarıyla alındı:${NC} $BACKUP_DIR/$FILENAME"
    
    # Eski yedekleri temizle (Son 5 yedeği tut)
    ls -t $BACKUP_DIR/*.sql | tail -n +6 | xargs -I {} rm -- {} 2>/dev/null
    echo "ℹ️  Son 5 yedek tutuldu, eskiler silindi."
else
    echo "❌ Yedek alma başarısız oldu!"
    exit 1
fi
