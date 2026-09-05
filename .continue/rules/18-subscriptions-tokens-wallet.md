---
name: 18-subscriptions-tokens-wallet
description: Подписки, квоты тарифа и отдельный кошелёк токенов (эталон DOC)
alwaysApply: true
---

# Подписки и кошелёк токенов

Эталон экономики: **DOC** (`D:\Cursor Project\DOC`). Платежи РФ: `08-billing-russia.md`. AI-списание: `12`, `16`.

## Две параллельные экономики

| Экономика | Единица | Источник | На что тратится |
|-----------|---------|----------|-----------------|
| **Подписка** | entitlements + квоты периода | тариф (plan) | каналы, посты, seats, storage, included AI |
| **Кошелёк** | ₽ (копейки на балансе) | произвольный top-up | overage AI / докупка токенов и кредитов |

Подписка **не** кладёт деньги на кошелёк. Кошелёк **не** меняет тариф.

## Подписка (plan)

- Тарифы: free + paid; цены `monthly` / `yearly` (₽).
- Entitlements: лимиты каналов, постов/период, участников, storage, feature flags.
- Included AI: text-токены (Yandex GPT), media-кредиты (KIE) — квоты периода, не cash.
- `null` quota = unlimited.
- **Нет rollover** неиспользованной квоты.
- Оплата one-shot (YooKassa/Robokassa); finalize идемпотентен (`pending → succeeded` один раз).
- Free: при регистрации; опционально TTL (`freePlanDurationDays` от `createdAt`).
- Смена тарифа = новая оплата / переход на free; prorate — позже, не копировать сложность без нужды.
- Auto-renew / принудительный downgrade после expiry — **явное решение продукта** (в DOC reminders есть, auto-downgrade нет — не копировать дыру молча).

## Кошелёк (wallet)

- Баланс пользователя в копейках (`wallet_balance_cents`).
- Top-up: произвольная сумма (min/max в конфиге), не обязательны «пакеты».
- Отдельная сущность платежа top-up; webhook finalize: +balance, идемпотентно.
- UI: баланс в chrome + страница тарифов/кошелька + история списаний.
- Потраченное с кошелька не refund автоматически; политика возвратов — manual + legal pages (WP).

## Приоритет списания (AI / generation)

1. Списать из **квоты тарифа** (included).
2. Остаток — с **кошелька** (₽ → credits/tokens по курсу, напр. kopecks_per_credit).
3. Если квота `null` (unlimited) — кошелёк **не** трогать.
4. Prefail: нет квоты и кошелёк пуст → hard deny **до** дорогого вызова.
5. Post-success debit обязан быть надёжным (не «успех задачи + тихий fail списания»).

Обычные фичи тарифа (посты, каналы) — только plan quota, без кошелька.

## Цикл квот

- Выбрать **одну** модель периода и не смешивать: billing-anchor от `paidAt`/`createdAt` **или** календарный месяц UTC.
- Usage events ledger; enforcement server-side в service layer.

## Слои (Go)

`handler` → `service` (subscribe / topup / quota / debit) → `repository` + `BillingProvider`.  
Те же правила для UI, webhooks, Public API.

## Запрещено

- Путать plan credits и wallet ₽ в одном балансе.
- Списывать кошелёк до исчерпания included quota (кроме marketplace-only, если появится).
- Доверять квотам только фронту.
- Non-idempotent payment finalize.
