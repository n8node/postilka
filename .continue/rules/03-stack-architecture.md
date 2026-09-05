---
name: 03-stack-architecture
description: Go backend и Next.js frontend — соглашения Postilka (Erman AI pattern)
globs: "{backend,frontend}/**/*.{go,ts,tsx}"
alwaysApply: false
---

# Стек: Go + Next.js

Процесс агента — `15-coding-process.md`.

## Go backend (`backend/`)

- **Router:** chi v5; версионированный API: `/api/v1/...` (снаружи nginx: `/app/api/v1/...`).
- **Config:** `caarlos0/env` + `.env`; validate on boot; document in `.env.example`.
- **DB:** pgx pool; queries in `repository/`; migrations **goose** in `backend/migrations/`.
- **Auth:** JWT session/API keys; middleware in `internal/middleware/`; RBAC on server — UI hide ≠ authz.
- **Handlers:** parse/validate input → call service → map errors to stable JSON + HTTP status.
- **Errors:** typed domain errors; русские user messages через error codes, не raw SQL/API в response.
- **Tests:** table-driven `_test.go` для service/repository; testify ok.
- **Workers:** `cmd/worker` — publish due posts, token refresh, KIE polling; не блокируй HTTP request на минуты.
- Не используй `database/sql` raw string concat; parameterized queries only.

## Next.js frontend (`frontend/`)

- **Next.js 15+**, App Router, TypeScript strict, Tailwind, shadcn/ui.
- **`basePath: '/app'`**, `output: 'standalone'` — с первого коммита (`next.config.ts`).
- **State:** nuqs (URL), zustand при необходимости; react-hook-form + zod.
- **API client:** `NEXT_PUBLIC_API_URL=/app/api/v1`; SSR — `INTERNAL_API_URL=http://backend:8080`.
- Server Components default; `"use client"` — исключение.
- i18n (next-intl): русский default — `07-brand-i18n-ui.md`.
- Не hardcode `/app` в каждом файле — env + helpers; не голые `fetch('/api/...')`.

## Shared contracts

- Request/response shapes: Go structs with json tags; frontend types/zod mirror API (generated or hand-maintained in `frontend/src/lib/api.ts` pattern like Erman).
- Provider settings — discriminated unions by `provider_id` on both sides.
