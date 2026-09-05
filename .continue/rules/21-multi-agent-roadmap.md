---
name: 21-multi-agent-roadmap
description: Мультиагентный roadmap Postilka — волны и зоны ответственности
alwaysApply: true
---

# Roadmap: мультиагентная разбивка

Один агент = одна зона; зависимости строго по волнам. Shell: git commit/push по запросу разрешены; docker/деплой — текст команд (`20-no-shell.md`).

## Волна 0 — текущий scaffold ✅

- Docker compose: nginx, backend, worker, frontend, wordpress, postgres, mysql
- Health API, landing `/app`, routing WP + `/app`, goose migration `schema_meta`
- Правила продукта `18`, `19`

## Волна 1 — первый деплой на сервер (MUST)

**Цель:** `https://postilka.ru/` → WP, `https://postilka.ru/app` → UI, API health, HTTPS, миграции, prod env.

| Агент | Зона | Deliverables |
|-------|------|--------------|
| **1-Infra** | nginx SSL, compose prod, certbot, deploy docs | `ssl.conf`, `default-prod.conf`, `docker-compose.prod.yml`, `scripts/deploy-server.md`, `.env.production.example` |
| **2-Backend** | boot-ready API | migrations on start, `/health`, `/api/v1/status`, structured logs, version in response |
| **3-Frontend** | deployable UI shell | `basePath /app`, standalone build, RU landing, env via compose |
| **4-WordPress** | marketing root | WP Dockerfile, HTTPS forward, `scripts/wp-bootstrap.sh` (install + permalinks + CTA) |

**Критерий готовности:** `curl https://postilka.ru/app/health` → ok; WP installable; `make prod` documented.

**Не входит:** auth, каналы, посты, биллинг, AI.

## Волна 2 — Auth + workspace ✅ (in progress / shipped)

| Агент | Deliverables |
|-------|--------------|
| **2-Backend** | users, workspaces, JWT cookie auth, register/login/logout/me |
| **3-Frontend** | `/app/auth/*`, `/app/dashboard`, AppShell, middleware |

## Волна 3 — Каналы (Telegram + VK)

| Агент | Deliverables |
|-------|--------------|
| **5-Providers** | `SocialProvider` interface, registry, capabilities |
| **5-Providers** | Telegram bot/channel connect; VK OAuth |
| **3-Frontend** | страница каналов, статусы, reconnect |
| **2-Backend** | encrypted tokens storage, channel CRUD |

## Волна 4 — Композер + посты (MVP)

| Агент | Deliverables |
|-------|--------------|
| **2-Backend** | posts, post_targets, drafts, validation per provider |
| **3-Frontend** | composer UI, channel picker, preview stub |
| **6-Media** | S3 presign upload (MinIO dev), media table |
| **7-Worker** | publish job: due posts → provider API, statuses, retry idempotent |

## Волна 5 — Календарь + планирование

| Агент | Deliverables |
|-------|--------------|
| **3-Frontend** | calendar week/month, list scheduled |
| **2-Backend** | schedule API, timezone, cancel/reschedule |
| **7-Worker** | poll `due_at`, concurrency from env |

## Волна 6 — Подписка + кошелёк

| Агент | Deliverables |
|-------|--------------|
| **8-Billing** | plans, entitlements, free on register (`18`) |
| **8-Billing** | YooKassa/Robokassa subscribe + wallet top-up |
| **3-Frontend** | `/app/plans`, balance widget, quota display |
| **2-Backend** | usage ledger, spend priority plan → wallet |

## Волна 7 — AI

| Агент | Deliverables |
|-------|--------------|
| **9-AI** | Yandex GPT text in composer (`16`) |
| **9-AI** | KIE media async + worker poll (`12`) |
| **8-Billing** | AI debit: quota then wallet, prefail |

## Волна 8 — Команда + approval

| Агент | Deliverables |
|-------|--------------|
| **2-Backend** | invites, roles, post approval workflow |
| **3-Frontend** | team settings, approve/reject UI |

## Волна 9 — Аналитика + API

| Агент | Deliverables |
|-------|--------------|
| **2-Backend** | metrics from provider APIs where available |
| **3-Frontend** | dashboard charts MVP |
| **10-Integrations** | Public API keys, webhooks (`11`) |

## Волна 10+ — later

Inbox, bulk, RSS, Zapier, глобальные сети + proxy, NATS/Dragonfly prod overlay, mobile.

## Параллельность внутри волны

```
Wave 1:  [1-Infra] ──┬── [2-Backend] ── [3-Frontend]
                      └── [4-WordPress]
Wave 3:  [5-Providers Telegram] || [5-Providers VK]  →  [3-Frontend channels]
Wave 4:  [6-Media] || [2-Backend posts]  →  [7-Worker]  →  [3-Frontend composer]
```

## Сервер первого деплоя

- IP: `91.197.96.34`, домен: `postilka.ru`
- Порты: 80, 443 наружу; DB internal
- Secrets: `.env` на сервере, не в git
- Инструкция: `scripts/deploy-server.md`
