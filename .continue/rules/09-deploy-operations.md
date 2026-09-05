---
name: 09-deploy-operations
description: Docker, деплой, goose migrations — Erman AI pattern
globs: "{nginx,wordpress,scripts,backend/migrations}/**/*,**/docker-compose*.yml,**/Dockerfile*,Makefile"
alwaysApply: false
---

# Деплой и эксплуатация

- Канон — **этот repo** + Erman AI compose/nginx как reference.
- **Dev compose:** nginx, backend, frontend, worker (optional), wordpress, mysql, postgres.
- **Prod overlay:** NATS JetStream, DragonflyDB, MinIO or external S3; resource limits; json-file logging (Erman `docker-compose.prod.yml`).
- Наружу — только nginx :80/:443; postgres, mysql, nats, dragonfly — internal.
- Pin image tags in prod.
- **Migrations:** `goose up` via Makefile/entrypoint; never destructive reset in prod.
- Secrets — server env; not in git/compose literals.
- Health: `GET /health` on backend; check worker consuming, postgres, nginx → app.
- Backup postgres + mysql (WP) + S3 before risky migrations.
- Routing WP + `/app` — `17`.
- Deploy/migrate/certs — only on explicit user request.
