#!/bin/bash
set -euo pipefail

echo "=== Postilka setup ==="

mkdir -p backups nginx/ssl wordpress/uploads
chmod +x scripts/*.sh 2>/dev/null || true

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — review secrets before make up"
fi

echo "=== Setup complete ==="
echo "  make up     — start stack"
echo "  http://localhost/       — WordPress"
echo "  http://localhost/app    — Postilka app"
echo "  http://localhost/app/health — backend health (via nginx)"
