#!/usr/bin/env bash
# Восстановление Postilka из полного архива бекапа (Postgres, MySQL, WordPress, .env, SSL).
# Пользовательские медиа остаются в S3 — их ключи уже в дампе Postgres.
#
#   cd /opt/postilka && bash scripts/restore-full.sh --latest
#   cd /opt/postilka && bash scripts/restore-full.sh /path/to/postilka-full-YYYY-MM-DD_HHMM.tar.gz
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f docker-compose.prod.yml ]]; then
  COMPOSE=(docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml)
else
  COMPOSE=(docker compose --env-file .env)
fi

ARCHIVE=""
if [[ "${1:-}" == "--latest" || -z "${1:-}" ]]; then
  if [[ ! -f backups/LATEST ]]; then
    echo "Нет backups/LATEST. Укажите путь к архиву или сначала сделайте бекап." >&2
    exit 1
  fi
  NAME="$(head -n 1 backups/LATEST | tr -d '\r')"
  ARCHIVE="backups/${NAME}"
else
  ARCHIVE="$1"
fi

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Архив не найден: $ARCHIVE" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Нужен .env в $ROOT" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

: "${POSTGRES_USER:=postilka}"
: "${POSTGRES_DB:=postilka}"
: "${WP_DB_ROOT_PASSWORD:?WP_DB_ROOT_PASSWORD не задан в .env}"

WORK="$(mktemp -d /tmp/postilka-restore.XXXXXX)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "Распаковка $ARCHIVE …"
tar -xzf "$ARCHIVE" -C "$WORK"

if [[ ! -f "$WORK/postgres.sql.gz" ]]; then
  echo "В архиве нет postgres.sql.gz" >&2
  exit 1
fi

echo "Останавливаю backend/worker/frontend …"
"${COMPOSE[@]}" stop backend worker frontend || true

echo "Восстанавливаю Postgres (${POSTGRES_DB}) …"
"${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};
SQL
gzip -dc "$WORK/postgres.sql.gz" | "${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

if [[ -f "$WORK/mysql.sql.gz" ]]; then
  echo "Восстанавливаю MySQL …"
  gzip -dc "$WORK/mysql.sql.gz" | "${COMPOSE[@]}" exec -T mysql mysql -u root -p"${WP_DB_ROOT_PASSWORD}"
fi

WP_ID="$("${COMPOSE[@]}" ps -q wordpress || true)"
if [[ -n "$WP_ID" && -f "$WORK/wordpress-html.tar.gz" ]]; then
  echo "Восстанавливаю файлы WordPress …"
  docker exec -i "$WP_ID" tar -C /var/www/html -xzf - < "$WORK/wordpress-html.tar.gz"
  docker exec "$WP_ID" chown -R www-data:www-data /var/www/html/wp-content || true
fi

if [[ -d "$WORK/ssl" ]] && ls "$WORK/ssl" >/dev/null 2>&1; then
  echo "Восстанавливаю nginx/ssl …"
  mkdir -p nginx/ssl
  cp -a "$WORK/ssl/." nginx/ssl/ || true
fi

if [[ -f "$WORK/dotenv" ]]; then
  echo "Сохраняю текущий .env в .env.bak-restore и подставляю из бекапа …"
  cp -a .env ".env.bak-restore-$(date +%Y%m%d_%H%M%S)"
  cp -a "$WORK/dotenv" .env
  chmod 600 .env || true
fi

echo "Запускаю сервисы …"
"${COMPOSE[@]}" up -d

echo
echo "Готово. Каналы и подключения в Postgres (шифрование — ENCRYPTION_KEY/JWT_SECRET из восстановленного .env)."
echo "Пользовательские медиа не копировались: они должны быть в том же S3-бакете, ключи — в workspace_files."
