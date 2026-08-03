# Postilka

Автопостинг и SMM-планирование для российского рынка. Greenfield scaffold (Go + Next.js + WordPress).

## Стек

- **Go** — API (`backend/`), worker (`cmd/worker`)
- **Next.js 15** — UI на `/app` (`frontend/`)
- **PostgreSQL** — данные приложения
- **WordPress + MySQL** — маркетинг на `/`
- **Nginx** — единая точка входа

## Быстрый старт (Docker)

```bash
cp .env.example .env   # или: make setup
make up
```

Открыть:

| URL | Сервис |
|-----|--------|
| http://localhost/ | WordPress (первый запуск — мастер установки) |
| http://localhost/app | Postilka UI |
| http://localhost/app/health | Health backend |
| http://localhost/app/api/v1/status | API status |

## Локальная разработка (без Docker)

**Backend:**

```bash
cd backend
go run ./cmd/server
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev -- -p 3000
```

Для полного routing нужен nginx из compose или прокси вручную.

## Команды

```bash
make up       # docker compose up --build -d
make down
make logs
make migrate  # goose в контейнере backend
make test     # go test ./...
make psql
```

## Структура

```
backend/     Go API + worker + goose migrations
frontend/    Next.js (basePath /app)
nginx/       reverse proxy
wordpress/   landing CMS
scripts/     setup.sh
```

Правила разработки — `.cursor/rules/`.
