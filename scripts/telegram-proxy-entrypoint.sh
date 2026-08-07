#!/bin/sh
set -eu

if [ -z "${TELEGRAM_UPSTREAM_PROXY:-}" ]; then
  echo "telegram-proxy: TELEGRAM_UPSTREAM_PROXY is not set in .env" >&2
  exit 1
fi

echo "telegram-proxy: listening on 0.0.0.0:8889"
exec gost -L="http://0.0.0.0:8889" -F="${TELEGRAM_UPSTREAM_PROXY}"
