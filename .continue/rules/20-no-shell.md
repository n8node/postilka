---
name: 20-no-shell
description: Shell ограничен; git commit/push по запросу разрешены
alwaysApply: true
---

# Shell policy

## Разрешено через Shell (из любого чата)

Когда пользователь **явно** просит — вызывай инструмент Shell:

- **git**: `status`, `diff`, `log`, `add`, `commit`, `push`, `pull`, `branch`, `fetch`
- Push **не запрещён** ни в каком чате: по запросу «пуш / push / закоммить и запушь» — делай сам, не отдавай только текст команд.

Соблюдай user rules по git safety (не force-push на main без явной просьбы, не трогай git config, не коммить secrets, commit только по просьбе).

## По умолчанию без Shell

Остальное CLI **не** запускай сам — дай команды текстом:

- docker / compose / make / деплой на сервер
- pnpm / npm / тесты / lint / curl / nslookup
- любые другие команды вне git выше

Не предлагай «я сам запущу» для docker/деплоя — только текст команд, если пользователь не снял это ограничение отдельно.

## Правки файлов

Разрешено без Shell: Read, Write, StrReplace, Grep, Glob, MCP (кроме обхода запретов через shell).
