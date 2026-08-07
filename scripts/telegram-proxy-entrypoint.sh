#!/bin/sh
set -eu

parse_proxy_url() {
  raw="$1"
  case "$raw" in
    http://*) rest="${raw#http://}" ;;
    *)
      echo "telegram-proxy: TELEGRAM_UPSTREAM_PROXY must start with http://" >&2
      exit 1
      ;;
  esac

  hostpart="${rest##*@}"
  userinfo="${rest%@*}"
  if [ "$userinfo" = "$rest" ] || [ -z "$hostpart" ]; then
    echo "telegram-proxy: invalid TELEGRAM_UPSTREAM_PROXY (expected http://user:pass@host:port)" >&2
    exit 1
  fi

  UPSTREAM_USER="${userinfo%%:*}"
  UPSTREAM_PASS="${userinfo#*:}"
  UPSTREAM_HOST="$hostpart"
}

if [ -n "${TELEGRAM_UPSTREAM_PROXY:-}" ]; then
  parse_proxy_url "$TELEGRAM_UPSTREAM_PROXY"
elif [ -n "${TELEGRAM_UPSTREAM_HOST:-}" ] && [ -n "${TELEGRAM_UPSTREAM_USER:-}" ]; then
  UPSTREAM_HOST="$TELEGRAM_UPSTREAM_HOST"
  UPSTREAM_USER="$TELEGRAM_UPSTREAM_USER"
  UPSTREAM_PASS="${TELEGRAM_UPSTREAM_PASSWORD:-}"
else
  echo "telegram-proxy: set TELEGRAM_UPSTREAM_PROXY or TELEGRAM_UPSTREAM_HOST/USER/PASSWORD in .env" >&2
  exit 1
fi

# gost v2: ?auth= is base64(user:pass) — avoids url.Parse on passwords containing %.
AUTH_B64=$(printf '%s' "${UPSTREAM_USER}:${UPSTREAM_PASS}" | base64 | tr -d '\n')
AUTH_QUERY=$(printf '%s' "$AUTH_B64" | sed 's/+/%2B/g; s/\//%2F/g; s/=/%3D/g')

echo "telegram-proxy: v3 listening on 0.0.0.0:8889 via ${UPSTREAM_HOST} (gost auth=base64)"
exec gost -L="http://0.0.0.0:8889" -F="http://${UPSTREAM_HOST}?auth=${AUTH_QUERY}"
