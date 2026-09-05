---
name: 01-architecture-principles
description: Архитектура greenfield Postilka — структура репо как Erman AI
alwaysApply: true
---

# Архитектура и принципы

- Наименьшее изменение, закрывающее задачу; без unrelated cleanup.
- **Структура репозитория (целевая, по Erman AI):**

```
postilka/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── nginx/
├── backend/
│   ├── cmd/server/main.go
│   ├── cmd/worker/main.go          # publish, refresh, AI jobs
│   ├── internal/{config,server,middleware,handler,service,repository,model}
│   └── migrations/                 # goose *.sql
├── frontend/                       # Next.js, basePath /app
├── wordpress/
└── scripts/
```

- **Слои Go:** handler (HTTP) → service (use case) → repository (SQL/I/O). Бизнес-логика не в handlers и не в React.
- **Frontend:** Server Components по умолчанию; client — исключение; API через `/app/api/v1` (browser) и `INTERNAL_API_URL` (SSR).
- Новые соцканалы — **`SocialProvider` interface** + registry в `internal/provider/` (или `internal/social/`).
- Специфика РФ (proxy, billing, locale) — отдельные packages/modules, не размазанные if по handlers.
- Миграции — **goose** SQL files; не ORM auto-migrate в prod.
- Breaking Public API — версионирование + changelog.
- Паттерны admin/config/proxy/storage — reference Erman AI и Photochka; адаптируй под Go, не copy-paste Go из Photochka без перевода.
