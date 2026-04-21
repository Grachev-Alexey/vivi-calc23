#!/usr/bin/env bash
# ============================================================
# Энсо — автоматическая установка на Ubuntu (22.04 / 24.04)
# Домен:  enso.tw1.ru
# СУБД:   локальная PostgreSQL,  пароль БД: cd5d56a8
# Запуск под root:  bash deploy/install.sh
# Менеджер процессов: PM2
# ============================================================
set -euo pipefail

DOMAIN="enso.tw1.ru"
APP_DIR="/var/www/enso"
DB_NAME="enso"
DB_USER="enso"
DB_PASSWORD="cd5d56a8"
NODE_MAJOR="20"

if [[ $EUID -ne 0 ]]; then
  echo "❌ Скрипт нужно запускать от root: bash deploy/install.sh"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📂 Исходники: $REPO_DIR"

# ----- 1. Системные пакеты -----------------------------------
echo "🧱 Устанавливаю системные пакеты..."
apt-get update
apt-get install -y curl ca-certificates gnupg lsb-release rsync \
                   nginx postgresql postgresql-contrib \
                   ufw certbot python3-certbot-nginx \
                   chromium-browser fonts-liberation libxss1 libnss3

# ----- 2. Node.js 20 -----------------------------------------
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  echo "🟢 Устанавливаю Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
echo "   node: $(node -v),  npm: $(npm -v)"

# ----- 3. PM2 (глобально) ------------------------------------
if ! command -v pm2 >/dev/null; then
  echo "📦 Устанавливаю PM2..."
  npm install -g pm2
fi
echo "   pm2: $(pm2 -v)"

# ----- 4. PostgreSQL: база и роль ----------------------------
echo "🐘 Настраиваю PostgreSQL (пользователь ${DB_USER}, база ${DB_NAME})..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# ----- 5. Копируем код ---------------------------------------
echo "📦 Копирую код в $APP_DIR..."
mkdir -p "$APP_DIR" /var/log/enso-calc
rsync -a --delete \
      --exclude='node_modules' --exclude='dist' --exclude='.git' \
      --exclude='.env' --exclude='.local' --exclude='attached_assets' \
      "$REPO_DIR"/ "$APP_DIR"/

# ----- 6. .env -----------------------------------------------
SESSION_SECRET="$(openssl rand -hex 48)"
echo "📝 Создаю $APP_DIR/.env..."
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
NODE_ENV=production
PORT=3000
HTTPS=true
SESSION_SECRET=${SESSION_SECRET}
EOF
chmod 600 "$APP_DIR/.env"

# ----- 7. Установка зависимостей и сборка --------------------
cd "$APP_DIR"
echo "⬇️  npm ci..."
npm ci --no-audit --no-fund

echo "🛠  npm run build..."
npm run build

# ----- 8. Миграции БД ----------------------------------------
echo "🗄  Применяю схему БД (drizzle push)..."
set -a; source .env; set +a
npm run db:push

# ----- 9. PM2 ------------------------------------------------
echo "⚙️  Запускаю приложение под PM2..."
pm2 delete enso-calc 2>/dev/null || true
pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save
# автозапуск PM2 от root после ребута
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
pm2 save

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

# ----- 12. SSL Let's Encrypt ---------------------------------
echo ""
echo "🔐 Запрашиваю SSL-сертификат..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --register-unsafely-without-email --redirect || \
        echo "⚠️  Не удалось — выполните позже: certbot --nginx -d $DOMAIN"

# ----- 13. Готово --------------------------------------------
echo ""
echo "✅ Установка завершена!"
echo ""
echo "   🌐 Сайт:        https://$DOMAIN"
echo "   📁 Каталог:     $APP_DIR"
echo "   🗄  База:        ${DB_NAME}  (user: ${DB_USER}, pass: ${DB_PASSWORD})"
echo "   ⚙️  PM2 процесс: enso-calc"
echo ""
echo "Полезные команды:"
echo "   pm2 status"
echo "   pm2 logs enso-calc"
echo "   pm2 restart enso-calc"
echo "   bash $APP_DIR/deploy/update.sh   # обновление"
echo ""
