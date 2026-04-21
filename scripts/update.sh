#!/usr/bin/env bash
# ============================================================
# Энсо — скрипт обновления приложения на проде (Ubuntu + pm2 + nginx)
# Запускать из /var/opt/enso:
#   sudo bash scripts/update.sh
# ============================================================

set -Eeuo pipefail

APP_NAME="enso-calc"
APP_DIR="/var/opt/enso"
NGINX_SITE="/etc/nginx/sites-available/enso.tw1.ru"
LOG_PREFIX="[update]"

log()  { echo -e "\033[1;36m${LOG_PREFIX}\033[0m $*"; }
ok()   { echo -e "\033[1;32m${LOG_PREFIX} ✓\033[0m $*"; }
warn() { echo -e "\033[1;33m${LOG_PREFIX} !\033[0m $*"; }
err()  { echo -e "\033[1;31m${LOG_PREFIX} ✗\033[0m $*" >&2; }

trap 'err "Скрипт прерван на строке $LINENO"; exit 1' ERR

# --- 0. Проверки окружения -----------------------------------------------
if [[ "$(id -u)" -ne 0 ]]; then
  err "Запусти скрипт через sudo."
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  err "Не найден каталог приложения: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
  warn "Файл .env не найден в $APP_DIR — приложение может не подхватить настройки."
fi

# --- 1. Обновление кода --------------------------------------------------
if [[ -d ".git" ]]; then
  log "Тяну свежий код из git..."
  git fetch --all --prune
  git reset --hard "@{u}"
  ok "Код обновлён до $(git rev-parse --short HEAD)"
else
  warn "Это не git-репозиторий — пропускаю git pull. Код должен быть залит вручную."
fi

# --- 2. Зависимости ------------------------------------------------------
log "Устанавливаю npm-зависимости..."
if [[ -f "package-lock.json" ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
ok "Зависимости установлены"

# --- 3. Сборка фронта и сервера -----------------------------------------
log "Собираю прод-бандл (vite build + esbuild)..."
npm run build
ok "Сборка готова в ./dist"

# --- 4. Миграции БД ------------------------------------------------------
log "Синхронизирую схему БД (drizzle-kit push)..."
if ! npm run db:push; then
  warn "db:push без --force не прошёл, пробую с --force..."
  npx drizzle-kit push --force
fi
ok "Схема БД актуальна"

# --- 5. Перезапуск приложения через pm2 ---------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  err "pm2 не установлен. Поставь: npm i -g pm2"
  exit 1
fi

log "Перезапускаю pm2-процесс ${APP_NAME}..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  warn "Процесс ${APP_NAME} в pm2 не найден — стартую заново."
  pm2 start npm --name "$APP_NAME" --update-env -- start
fi
pm2 save >/dev/null
ok "pm2 перезапущен"

# --- 6. Проверка и перезагрузка nginx -----------------------------------
if command -v nginx >/dev/null 2>&1; then
  log "Проверяю конфиг nginx..."
  if nginx -t; then
    systemctl reload nginx
    ok "nginx перезагружен"
  else
    err "Ошибка в конфиге nginx — reload пропущен. Проверь $NGINX_SITE"
    exit 1
  fi
else
  warn "nginx не установлен — пропускаю."
fi

# --- 7. Хелсчек ----------------------------------------------------------
PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
PORT="${PORT:-3000}"

log "Жду, пока приложение поднимется на порту ${PORT}..."
for i in {1..15}; do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/api/auth/check" \
     || curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/auth/check" | grep -qE '^(200|401)$'; then
    ok "Приложение отвечает на http://127.0.0.1:${PORT}"
    break
  fi
  sleep 1
  if [[ "$i" -eq 15 ]]; then
    warn "Не дождался ответа за 15 сек. Глянь логи: pm2 logs ${APP_NAME}"
  fi
done

ok "Обновление завершено."
echo
echo "Полезные команды:"
echo "  pm2 logs ${APP_NAME}      — смотреть логи приложения"
echo "  pm2 status                — статус процесса"
echo "  systemctl status nginx    — статус nginx"
