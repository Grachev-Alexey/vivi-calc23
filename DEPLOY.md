# Развёртывание «Энсо» на Ubuntu сервер

Домен: **enso.tw1.ru** · База данных: **локальная PostgreSQL** · Запуск под **systemd** + **nginx** + **Let's Encrypt**.

---

## ⚡ Быстрая установка (одной командой)

На сервере (Ubuntu 22.04 / 24.04, root или sudo-пользователь):

```bash
# 1. Скопируйте проект на сервер (любым удобным способом)
#    например, через git:
sudo apt update && sudo apt install -y git
sudo mkdir -p /opt && cd /opt
sudo git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> enso-src
cd enso-src

# 2. Запустите установщик
sudo bash deploy/install.sh
```

Скрипт **сам**:

1. поставит Node.js 20, nginx, PostgreSQL, certbot и зависимости;
2. создаст системного пользователя `enso`;
3. создаст БД `enso` и пользователя `enso` со случайным паролем;
4. скопирует код в `/var/www/enso`, поставит npm-зависимости и соберёт продакшн-бандл;
5. сгенерирует `.env` с `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `PORT=3000`;
6. применит схему БД (`drizzle-kit push`);
7. зарегистрирует сервис `enso-calc` в systemd и запустит его;
8. настроит nginx как обратный прокси на `127.0.0.1:3000`;
9. откроет порты 80/443 в `ufw`;
10. получит SSL-сертификат Let's Encrypt для **enso.tw1.ru** и включит редирект http → https.

После окончания скрипта сайт будет доступен по адресу **https://enso.tw1.ru**.

---

## 📋 Перед запуском убедитесь, что

- DNS-запись **A `enso.tw1.ru` → IP вашего сервера** уже настроена и распространилась (проверка: `dig +short enso.tw1.ru`). Это необходимо для выпуска SSL-сертификата.
- На сервере свободны порты **80**, **443**, **3000** (3000 слушается только на `127.0.0.1`).
- У вас права root / sudo.

Если SSL не получится с первого раза (DNS ещё не успел обновиться) — выполните позже вручную:

```bash
sudo certbot --nginx -d enso.tw1.ru
```

---

## 🛠 Что делает установщик пошагово

| Файл | Назначение |
| --- | --- |
| `deploy/install.sh` | Полная установка с нуля. |
| `deploy/update.sh` | Обновление приложения (после `git pull`). |
| `deploy/systemd/enso-calc.service` | systemd-юнит, запускающий `node dist/index.js`. |
| `deploy/nginx/enso.tw1.ru.conf` | Конфиг сайта для nginx. |
| `.env.example` | Шаблон переменных окружения. |

---

## 🔄 Обновление приложения

```bash
cd /opt/enso-src      # ваш каталог с git
sudo git pull
sudo rsync -a --delete \
     --exclude=node_modules --exclude=dist --exclude=.git \
     --exclude=.env --exclude=.local --exclude=attached_assets \
     ./ /var/www/enso/

sudo bash /var/www/enso/deploy/update.sh
```

`update.sh` поставит зависимости, соберёт фронт, применит миграции и перезапустит сервис.

---

## 🔧 Управление сервисом

```bash
sudo systemctl status enso-calc        # статус
sudo systemctl restart enso-calc       # перезапуск
sudo systemctl stop enso-calc          # остановка
sudo journalctl -u enso-calc -f        # логи в реальном времени
sudo journalctl -u enso-calc -n 200    # последние 200 строк
```

---

## 🗄 База данных

Установщик создаёт локальную базу `enso` (пользователь `enso`, пароль — случайный, прописан в `/var/www/enso/.env`).

Подключиться руками:

```bash
sudo -u postgres psql -d enso
# или
psql "$(grep DATABASE_URL /var/www/enso/.env | cut -d= -f2-)"
```

Бэкап:

```bash
sudo -u postgres pg_dump -Fc enso > enso-$(date +%F).dump
```

Восстановление:

```bash
sudo -u postgres pg_restore -d enso --clean --if-exists enso-XXXX.dump
```

---

## 🔐 Переменные окружения (`/var/www/enso/.env`)

| Переменная | Описание |
| --- | --- |
| `DATABASE_URL` | Строка подключения к PostgreSQL. |
| `NODE_ENV` | `production`. |
| `PORT` | Порт приложения (по умолчанию 3000, слушается на `127.0.0.1`). |
| `HTTPS` | `true` — включает `Secure`-флаг для cookie-сессий. |
| `SESSION_SECRET` | Длинный случайный секрет для подписи сессий. |

Менять `.env` → перезапускать сервис: `sudo systemctl restart enso-calc`.

---

## 🧯 Если что-то пошло не так

| Симптом | Что делать |
| --- | --- |
| `502 Bad Gateway` | Приложение упало. `journalctl -u enso-calc -n 100`. |
| `nginx: configuration test failed` | Проверить `nginx -t`, поправить `/etc/nginx/sites-available/enso.tw1.ru`. |
| Не выпустился сертификат | `dig +short enso.tw1.ru` должен показать IP сервера; затем `sudo certbot --nginx -d enso.tw1.ru`. |
| Ошибка БД при старте | Проверить `psql` подключение, корректность `DATABASE_URL` в `.env`. |
| После `git pull` не видно изменений | Запустить `sudo bash /var/www/enso/deploy/update.sh` (нужна пересборка фронта). |

---

## 🧪 Ручная установка (если не хочется скрипт)

```bash
# Зависимости
sudo apt update
sudo apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx
# Node 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Пользователь и БД
sudo useradd --system --create-home --shell /bin/bash enso
sudo -u postgres createuser enso --pwprompt
sudo -u postgres createdb -O enso enso

# Код
sudo mkdir -p /var/www/enso && sudo chown enso:enso /var/www/enso
sudo -u enso rsync -a ./ /var/www/enso/
cd /var/www/enso
sudo -u enso cp .env.example .env
sudo -u enso nano .env       # пропишите DATABASE_URL и SESSION_SECRET

sudo -u enso npm ci
sudo -u enso npm run build
sudo -u enso npm run db:push

# systemd
sudo install -m 644 deploy/systemd/enso-calc.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now enso-calc

# nginx + SSL
sudo install -m 644 deploy/nginx/enso.tw1.ru.conf /etc/nginx/sites-available/enso.tw1.ru
sudo ln -s /etc/nginx/sites-available/enso.tw1.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d enso.tw1.ru
```

Готово.
