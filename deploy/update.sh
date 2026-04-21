#!/usr/bin/env bash
# ============================================================
# Энсо — обновление приложения (под root, через PM2)
# Запуск:  bash /var/www/enso/deploy/update.sh
# ============================================================
set -euo pipefail

APP_DIR="/var/www/enso"

if [[ $EUID -ne 0 ]]; then
  echo "❌ Запустите от root: bash deploy/update.sh"
  exit 1
fi

cd "$APP_DIR"

echo "⬇️  npm ci..."
npm ci --no-audit --no-fund

echo "🛠  npm run build..."
npm run build

echo "🗄  npm run db:push..."
set -a; source .env; set +a
npm run db:push

echo "🔁  Перезапускаю PM2..."
pm2 reload enso-calc || pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save
pm2 status

echo "✅ Готово."
