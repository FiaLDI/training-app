#!/usr/bin/env bash
# Renew Let's Encrypt certificates and reload nginx if anything changed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p certbot/www certbot/conf

echo "==> Renewing certificates"
docker compose --profile ssl run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

echo "==> Reloading nginx"
docker compose exec nginx nginx -s reload

echo "Done."
