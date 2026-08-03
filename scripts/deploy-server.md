# Первый деплой Postilka на сервер

Сервер: **91.197.96.34**, домен: **postilka.ru** (A-запись уже на IP).

## 1. Подготовка сервера

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y git docker.io docker-compose-plugin certbot make

sudo usermod -aG docker $USER
# перелогиниться

sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
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
# или: docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up --build -d

docker compose ps
docker compose logs -f nginx backend frontend
```

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
make prod
# goose migrations run on backend boot; или: make migrate
```

## 8. Бэкапы (рекомендуется до prod data)

```bash
docker compose exec -T postgres pg_dump -U postilka postilka > backups/postgres-$(date +%F).sql
docker compose exec -T mysql mysqldump -u root -p"$WP_DB_ROOT_PASSWORD" wordpress > backups/wp-$(date +%F).sql
```

## Troubleshooting

- **nginx не стартует:** проверить `nginx/ssl/*.pem`, `docker compose logs nginx`
- **502 на /app:** `docker compose logs frontend backend`
- **API недоступен:** проверить `location ^~ /app/api/` в `nginx/snippets/postilka-locations.conf`
- **WP mixed content:** `WORDPRESS_CONFIG_EXTRA` в compose уже прокидывает HTTPS за proxy

## Локальная разработка (без SSL)

```bash
cp .env.example .env
make up
# http://localhost/app — без prod overlay
```
