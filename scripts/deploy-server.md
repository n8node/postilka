# Первый деплой Postilka на сервер

Сервер: **91.197.96.34**, домен: **postilka.ru** (A-запись уже на IP).

## 1. Подготовка сервера

```bash
# Ubuntu 24.04 (noble) — пакет docker-compose-plugin в дефолтных репо НЕТ
sudo apt update
sudo apt install -y git docker.io docker-compose-v2 certbot make

sudo systemctl enable --now docker
docker --version
docker compose version   # должно работать (v2)

# Если не root:
sudo usermod -aG docker $USER
# перелогиниться

sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**Ubuntu 22.04+ альтернатива:** `docker-compose-plugin` из [официального репо Docker](https://docs.docker.com/engine/install/ubuntu/) — если `docker-compose-v2` недоступен:

```bash
sudo apt install -y git docker.io certbot make
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
sudo systemctl enable --now docker
```

## 2. Клонирование и env

```bash
cd /opt
sudo git clone https://github.com/n8node/postilka.git
sudo chown -R $USER:$USER postilka
cd postilka

cp .env.production.example .env
# Отредактировать .env — сменить все CHANGE_ME_* на сильные пароли
nano .env
```

## 3. SSL-сертификат (первый раз)

```bash
# Пока nginx не слушает 80 с redirect — получаем standalone
sudo certbot certonly --standalone -d postilka.ru -d www.postilka.ru --agree-tos -m admin@postilka.ru

mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/postilka.ru/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/postilka.ru/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 600 nginx/ssl/privkey.pem
```

Подробнее: `nginx/ssl/README.md`.

## 4. Запуск prod

```bash
make prod
# или без make:
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up --build -d

docker compose --env-file .env ps
docker compose --env-file .env logs -f nginx backend frontend
```

`make prod` завершается ошибкой, если nginx, frontend или backend не поднялись
либо edge не отвечает на `/app/health` и `/app/`.

## 5. Проверка

| URL | Ожидание |
|-----|----------|
| https://postilka.ru/ | WordPress (мастер установки при первом визите) |
| https://postilka.ru/app | Postilka UI (landing + health card) |
| https://postilka.ru/app/health | `{"status":"ok",...}` |
| https://postilka.ru/app/api/v1/status | API scaffold JSON |

```bash
curl -sS https://postilka.ru/app/health | jq .
curl -sS https://postilka.ru/app/api/v1/status | jq .
```

## 6. WordPress (после первого up)

```bash
# Задать переменные или отредактировать scripts/wp-bootstrap.sh
export WP_URL=https://postilka.ru
export WP_TITLE="Postilka"
export WP_ADMIN_USER=admin
export WP_ADMIN_EMAIL=admin@postilka.ru
export WP_ADMIN_PASSWORD='CHANGE_ME'

bash scripts/wp-bootstrap.sh
```

Скрипт: install (если пусто), permalinks, главная страница с CTA на `/app`.

## 7. Обновление релиза

```bash
cd /opt/postilka
git pull origin main

# Обновляйте только изменившиеся сервисы:
make prod-backend      # API + worker (+ goose на старте), затем edge health-check
make prod-frontend     # Next.js UI, затем edge health-check
make prod-nginx        # только если меняли nginx/*.conf, затем edge health-check

# Полный стек (инфраструктурные изменения):
# make prod

# Повторная ручная проверка:
# make verify-release
```

## 8. Бекапы

В админке: **Настройки → Бекапы**. Расписание и кнопка пишут архив в `backups/` и в S3 (`platform-backups/`). Пользовательские медиа кабинета в архив не входят — только ключи S3 в Postgres.

Восстановление одной командой (на сервере, контейнеры должны быть подняты):

```bash
cd /opt/postilka && bash scripts/restore-full.sh --latest
# или
cd /opt/postilka && bash scripts/restore-full.sh backups/postilka-full-YYYY-MM-DD_HHMM.tar.gz
```

## Troubleshooting

- **`Unable to locate package docker-compose-plugin`:** на Ubuntu 24.04 используйте `docker-compose-v2` (см. §1).
- **`docker: command not found`:** `apt install docker.io && systemctl enable --now docker`.
- **`make: command not found`:** `apt install make` или запуск без make (см. §4).
- **Build timeout на GitHub / Alpine:** обновите repo (`git pull`) — wp-cli vendored в `wordpress/bin/`, Alpine mirror: `mirror.yandex.ru/mirrors/alpine/v3.x` (без двойного `/alpine/`). Пересборка: `docker compose ... build --no-cache wordpress backend`.
- **nginx не стартует:** проверить `nginx/ssl/*.pem`, `docker compose logs nginx`
- **502 на /app:** `docker compose logs frontend backend`
- **API недоступен:** проверить `location ^~ /app/api/` в `nginx/snippets/postilka-locations.conf`
- **WP mixed content:** `WORDPRESS_CONFIG_EXTRA` в compose уже прокидывает HTTPS за proxy
- **Контейнеры Up, но браузер не открывает Postilka:** это не доказывает browser cache. Проверьте `/app/health` с сервера, затем сравните тот же ПК через домашнюю сеть и hotspot. При отказе соберите `chrome://net-export` и `docker compose ... logs --tail=100 nginx`; если запрос с ПК не попал в access log, исследуйте маршрут/роутер/ISP/TLS inspection.
- **VK OAuth / `network_error`, `сервер не достучался до id.vk.ru`:** OAuth-ключи уже не при чём — backend не может завершить HTTPS к `id.vk.ru` из контейнера.

  ```bash
  # 1) С хоста (не из Docker):
  curl -v --max-time 20 https://id.vk.ru/

  # 2) Из контейнера backend (BusyBox wget без -4):
  docker compose exec backend wget -T 20 -S --spider https://id.vk.ru/ 2>&1
  ```

  | Хост | Контейнер | Причина | Действие |
  |------|-----------|---------|----------|
  | OK | timeout | Docker bridge→VK TLS broken (оба IP); Google из контейнера OK | `outbound-proxy` (tinyproxy, host network) — см. ниже |
  | timeout | timeout | блокировка исходящего HTTPS у VPS / VK | тикет хостингу |
  | OK | OK | код/конфиг OAuth | логи `docker compose logs backend --tail=50` |

  **Prod fix (в `docker-compose.prod.yml`):** сервис `outbound-proxy` (tinyproxy, `network_mode: host`).
  Backend/worker ходят в VK через `HTTPS_PROXY=http://host.docker.internal:8888`.

  ```bash
  cd /opt/postilka && git pull
  make prod-backend-nocache

  # Проверка: tinyproxy на хосте
  curl -x http://127.0.0.1:8888 -I --max-time 15 https://id.vk.ru/

  # Проверка из backend-контейнера
  docker compose exec backend wget -T 20 -S --spider https://id.vk.ru/ 2>&1
  ```

  Ожидается HTTP 302, не timeout. Затем привязка VK в настройках.

  **Диагностика (опционально):**

  ```bash
  docker run --rm --network host curlimages/curl curl -v --max-time 20 https://id.vk.ru/
  docker run --rm curlimages/curl curl -v --max-time 20 --resolve id.vk.ru:443:93.186.237.1 https://id.vk.ru/
  ```

  Если `--network host` OK, а bridge timeout — нужен `outbound-proxy` (не `extra_hosts`).

- **Telegram admin / `context deadline exceeded` через внешний прокси:** из Docker bridge часто **нет** прямого TCP к внешнему HTTP-прокси (как с VK). Используйте **gost** на хосте (`telegram-proxy`, порт **8889**).

  В `.env` на сервере (**до** `make prod-backend`):

  ```bash
  TELEGRAM_UPSTREAM_HOST=5.35.83.120:3128
  TELEGRAM_UPSTREAM_USER=tgproxy
  TELEGRAM_UPSTREAM_PASSWORD=PASSWORD
  ```

  (Отдельный пользователь `tgproxy` для Telegram — как в Erman AI; не root SSH.)

  **Важно:** контейнер `telegram-proxy` (gost) берёт upstream **только из `.env`**, не из админки.
  После правки `.env` — `up -d --force-recreate telegram-proxy`.

  Альтернатива одной строкой (пароль с `%` — как есть):

  ```bash
  TELEGRAM_UPSTREAM_PROXY=http://root:PASSWORD@5.35.83.120:3128
  ```

  Предпочтительны **отдельные переменные** — Docker/env не ломает `%` в URL.

  После `git pull`, если менялся `scripts/telegram-proxy-entrypoint.sh`, **обязательно** пересоздайте контейнер (bind-mount не подхватывается без recreate):

  ```bash
  cd /opt/postilka && git pull
  make prod-backend
  # или только прокси:
  docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate telegram-proxy

  docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml ps telegram-proxy
  docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml logs --tail=30 telegram-proxy
  ss -ltnp | grep 8889 || true
  ```

  В логах должны быть **две** строки: `telegram-proxy: v4 listening...` и `route.go:700: http://:8889 on ...`.
  Если только первая — gost упал; смотрите `logs --tail=30`. Если `ss` пустой — порт не слушается.

  Проверка gost на хосте:

  ```bash
  curl -x http://127.0.0.1:8889 -I --max-time 20 https://api.telegram.org/
  ```

  Проверка из backend-контейнера (должен идти через `TELEGRAM_LOCAL_PROXY`):

  ```bash
  docker compose exec backend wget -T 20 -S --spider https://api.telegram.org/ 2>&1
  ```

- **Самодиагностика (каждые 30 мин):** backend отправляет отчёт в admin Telegram-чат; при сбое бота/прокси — email всем `is_platform_admin` пользователям. Первый запуск через 2 мин после старта backend.

  В админке Telegram: прокси **включён**, URL питерского прокси в списке (для учёта), backend сам использует `host.docker.internal:8889`. Напишите боту `/start`, затем тестовое сообщение.

- **MAX OAuth / webhook не приходит, `curl platform-api2.max.ru` → `SSL certificate problem`:** API MAX подписан сертификатами **НУЦ Минцифры**. Без них backend не регистрирует webhook.

  **На хосте (Ubuntu) для ручной проверки curl:**

  ```bash
  sudo apt install -y wget
  cd /tmp
  wget https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt
  wget https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt
  sudo cp russian_trusted_* /usr/local/share/ca-certificates/
  sudo update-ca-certificates
  curl -s "https://platform-api2.max.ru/subscriptions" -H "Authorization: BOT_TOKEN" | jq .
  ```

  **Backend (prod):** образ `backend` уже ставит эти CA в Dockerfile. После обновления:

  ```bash
  git pull && make prod-backend-nocache
  ```

  Затем в админке Postilka → MAX → **Сохранить** (регистрация webhook). В логах backend при «Запустить» в MAX должен появиться `POST .../max/webhook`.

## Локальная разработка (без SSL)

```bash
cp .env.example .env
make up
# http://localhost/app — без prod overlay
```
