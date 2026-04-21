#!/usr/bin/env bash
# ============================================================
# Энсо — автоматическая установка на Ubuntu (22.04 / 24.04)
# Домен: enso.tw1.ru
# Запуск:  sudo bash deploy/install.sh
# ============================================================
set -euo pipefail

DOMAIN="enso.tw1.ru"
APP_USER="enso"
APP_DIR="/var/www/enso"
DB_NAME="enso"
DB_USER="enso"
NODE_MAJOR="20"

if [[ $EUID -ne 0 ]]; then
  echo "❌ Запустите скрипт через sudo: sudo bash deploy/install.sh"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📂 Исходники проекта: $REPO_DIR"

# ----- 1. Системные пакеты -----------------------------------
echo "🧱 Устанавливаю системные пакеты..."
apt-get update
apt-get install -y curl ca-certificates gnupg lsb-release \
                   nginx postgresql postgresql-contrib \
                   ufw certbot python3-certbot-nginx \
                   chromium-browser fonts-liberation libxss1 libnss3

# ----- 2. Node.js 20 (NodeSource) ----------------------------
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  echo "🟢 Устанавливаю Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
echo "   node: $(node -v),  npm: $(npm -v)"

# ----- 3. Системный пользователь -----------------------------
if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "👤 Создаю пользователя $APP_USER..."
  useradd --system --create-home --shell /bin/bash "$APP_USER"
fi

# ----- 4. PostgreSQL: база и роль ----------------------------
echo "🐘 Настраиваю PostgreSQL..."
DB_PASSWORD="$(openssl rand -hex 24)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# ----- 5. Копируем код в /var/www/enso -----------------------
echo "📦 Копирую код в $APP_DIR..."
mkdir -p "$APP_DIR"
rsync -a --delete \
      --exclude='node_modules' --exclude='dist' --exclude='.git' \
      --exclude='.env' --exclude='.local' --exclude='attached_assets' \
      "$REPO_DIR"/ "$APP_DIR"/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ----- 6. .env -----------------------------------------------
SESSION_SECRET="$(openssl rand -hex 48)"
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "📝 Создаю $APP_DIR/.env..."
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
NODE_ENV=production
PORT=3000
HTTPS=true
SESSION_SECRET=${SESSION_SECRET}
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  echo "ℹ️  $APP_DIR/.env уже существует — оставляю как есть."
  echo "    Сгенерированный пароль БД: ${DB_PASSWORD}"
  echo "    (база обновлена этим паролем — синхронизируйте .env при необходимости)"
fi

# ----- 7. Установка npm-зависимостей и сборка ----------------
echo "⬇️  Устанавливаю npm-зависимости..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm ci --no-audit --no-fund"

echo "🛠  Собираю приложение..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm run build"

# ----- 8. Миграции БД ----------------------------------------
echo "🗄  Применяю схему БД (drizzle push)..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && set -a && source .env && set +a && npm run db:push"

# ----- 9. systemd unit ---------------------------------------
echo "⚙️  Устанавливаю systemd-сервис enso-calc..."
install -m 644 "$APP_DIR/deploy/systemd/enso-calc.service" /etc/systemd/system/enso-calc.service
systemctl daemon-reload
systemctl enable enso-calc
systemctl restart enso-calc

# ----- 10. nginx ---------------------------------------------
echo "🌐 Настраиваю nginx для $DOMAIN..."
install -m 644 "$APP_DIR/deploy/nginx/${DOMAIN}.conf" /etc/nginx/sites-available/${DOMAIN}
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ----- 11. Firewall ------------------------------------------
echo "🛡  Настраиваю firewall (ufw)..."
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true

# ----- 12. SSL сертификат (Let's Encrypt) --------------------
echo ""
echo "🔐 Запрашиваю SSL-сертификат у Let's Encrypt..."
echo "   Если домен ещё не указывает на этот сервер (A-запись) —"
echo "   шаг упадёт. Запустите потом вручную:"
echo "   sudo certbot --nginx -d $DOMAIN"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --register-unsafely-without-email --redirect || \
        echo "⚠️  Не удалось получить сертификат — выполните позже."

# ----- 13. Готово --------------------------------------------
echo ""
echo "✅ Установка завершена!"
echo ""
echo "   🌐 Сайт:           https://$DOMAIN"
echo "   👤 systemd-юнит:   enso-calc"
echo "   📁 Каталог:        $APP_DIR"
echo "   🗄  База данных:    $DB_NAME (пользователь $DB_USER)"
echo ""
echo "Полезные команды:"
echo "   journalctl -u enso-calc -f       # логи приложения"
echo "   systemctl restart enso-calc      # перезапуск"
echo "   sudo bash $APP_DIR/deploy/update.sh  # обновление"
echo ""
