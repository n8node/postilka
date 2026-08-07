#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

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

USER_JSON=$(json_escape "$UPSTREAM_USER")
PASS_JSON=$(json_escape "$UPSTREAM_PASS")

cat >/tmp/gost.json <<EOF
{
  "ServeNodes": ["http://0.0.0.0:8889"],
  "ChainNodes": [
    {
      "Name": "http",
      "Addr": "${UPSTREAM_HOST}",
      "Connector": {"Type": "http"},
      "Dialer": {"Type": "tcp"},
      "User": "${USER_JSON}",
      "Pass": "${PASS_JSON}"
    }
  ]
}
EOF

echo "telegram-proxy: listening on 0.0.0.0:8889 via ${UPSTREAM_HOST}"
exec gost -C /tmp/gost.json
