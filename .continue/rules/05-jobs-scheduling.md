---
name: 05-jobs-scheduling
description: Планирование публикаций, workers, NATS и идемпотентность
globs: "backend/**/*.{go,sql}"
alwaysApply: false
---

# Jobs, scheduling, workers

- **Не Temporal.** Durable/async work — **Go worker** (`cmd/worker`) + PostgreSQL + **NATS JetStream** в production (Erman AI pattern).
- **Scheduled posts:** таблица с `due_at`, `status`, idempotency key; worker poll или NATS consumer забирает due jobs.
- **Publish activity:** side effects только в worker/service layer; HTTP handler лишь enqueue или sync draft save.
- **Idempotency:** stable key per post+channel; retry must not create duplicate publishes.
- **Concurrency:** per-provider limits (env `WORKER_PUBLISH_CONCURRENCY_*` или registry); respect platform rate limits.
- **Token refresh:** отдельный worker loop/ticker; concurrency-safe; `needs_reconnect` on revoke.
- **AI jobs (KIE):** async poll/webhook in worker; не long-hold HTTP.
- **Retry:** exponential backoff for transient errors; permanent fail (auth, validation) → terminal status + user-visible error.
- **Cancel:** user cancel → status cancelled; worker must not publish after cancel visible in DB.
- **Logs:** post_id, integration_id, status — not tokens or post body.
- **Dev:** worker может run in-process или отдельный compose service; prod — отдельный replica/container.
- **Tests:** due_at selection, idempotent publish, cancel race, retry after transient failure.
