#!/bin/sh
set -eu

parse_proxy_url() {
  raw="$1"
  case "$raw" in
    http://*) rest="${raw#http://}" ;;
    *)
      echo "youtube-proxy: YOUTUBE_UPSTREAM_PROXY must start with http://" >&2
      exit 1
      ;;
  esac

  hostpart="${rest##*@}"
  userinfo="${rest%@*}"
  if [ "$userinfo" = "$rest" ] || [ -z "$hostpart" ]; then
    echo "youtube-proxy: invalid YOUTUBE_UPSTREAM_PROXY (expected http://user:pass@host:port)" >&2
    exit 1
  fi

  UPSTREAM_USER="${userinfo%%:*}"
  UPSTREAM_PASS="${userinfo#*:}"
  UPSTREAM_HOST="$hostpart"
}

if [ -n "${YOUTUBE_UPSTREAM_HOST:-}" ] && [ -n "${YOUTUBE_UPSTREAM_USER:-}" ]; then
  UPSTREAM_HOST="$YOUTUBE_UPSTREAM_HOST"
  UPSTREAM_USER="$YOUTUBE_UPSTREAM_USER"
  UPSTREAM_PASS="${YOUTUBE_UPSTREAM_PASSWORD:-}"
  UPSTREAM_SOURCE="split env"
elif [ -n "${YOUTUBE_UPSTREAM_PROXY:-}" ]; then
  parse_proxy_url "$YOUTUBE_UPSTREAM_PROXY"
  UPSTREAM_SOURCE="YOUTUBE_UPSTREAM_PROXY"
elif [ -n "${TELEGRAM_UPSTREAM_HOST:-}" ] && [ -n "${TELEGRAM_UPSTREAM_USER:-}" ]; then
  UPSTREAM_HOST="$TELEGRAM_UPSTREAM_HOST"
  UPSTREAM_USER="$TELEGRAM_UPSTREAM_USER"
  UPSTREAM_PASS="${TELEGRAM_UPSTREAM_PASSWORD:-}"
  UPSTREAM_SOURCE="telegram split env fallback"
elif [ -n "${TELEGRAM_UPSTREAM_PROXY:-}" ]; then
  parse_proxy_url "$TELEGRAM_UPSTREAM_PROXY"
  UPSTREAM_SOURCE="TELEGRAM_UPSTREAM_PROXY fallback"
else
  echo "youtube-proxy: missing upstream in .env — set YOUTUBE_UPSTREAM_* or TELEGRAM_UPSTREAM_*" >&2
  exit 1
fi

AUTH_B64=$(printf '%s' "${UPSTREAM_USER}:${UPSTREAM_PASS}" | base64 | tr -d '\n')

cat >/tmp/youtube-gost.json <<EOF
{
  "ServeNodes": ["http://:8890"],
  "ChainNodes": ["http://${UPSTREAM_HOST}?auth=${AUTH_B64}"]
}
EOF

echo "youtube-proxy: v1 listening on :8890 via ${UPSTREAM_HOST} user=${UPSTREAM_USER} (${UPSTREAM_SOURCE})"
exec /bin/gost -C /tmp/youtube-gost.json
