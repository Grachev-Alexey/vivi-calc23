#!/usr/bin/env bash
# ============================================================
# Энсо — обновление приложения (после git pull / нового кода)
# Запуск:  sudo bash /var/www/enso/deploy/update.sh
# ============================================================
set -euo pipefail

APP_USER="enso"
APP_DIR="/var/www/enso"

if [[ $EUID -ne 0 ]]; then
  echo "❌ Запустите через sudo: sudo bash deploy/update.sh"
  exit 1
fi

cd "$APP_DIR"

echo "⬇️  npm ci..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm ci --no-audit --no-fund"

echo "🛠  npm run build..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm run build"

echo "🗄  npm run db:push..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && set -a && source .env && set +a && npm run db:push"

echo "🔁  Перезапускаю enso-calc..."
systemctl restart enso-calc
sleep 1
systemctl status enso-calc --no-pager | head -15

echo "✅ Готово."
