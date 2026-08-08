#!/usr/bin/env bash
# Create a short-lived self-signed cert so nginx can start before Let's Encrypt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="$ROOT/certbot/conf/live/ip"
RENEWAL="$ROOT/certbot/conf/renewal/ip.conf"

mkdir -p "$ROOT/certbot/www" "$ROOT/certbot/conf"

# Real Let's Encrypt cert already present
if [[ -f "$RENEWAL" && -f "$LIVE/fullchain.pem" && -f "$LIVE/privkey.pem" ]]; then
  exit 0
fi

# Dummy already in place
if [[ -f "$LIVE/fullchain.pem" && -f "$LIVE/privkey.pem" ]]; then
  exit 0
fi

mkdir -p "$LIVE"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$LIVE/privkey.pem" \
  -out "$LIVE/fullchain.pem" \
  -subj "/CN=localhost" \
  >/dev/null 2>&1

echo "Created temporary self-signed certificate at certbot/conf/live/ip/"
echo "Run: npm run ssl:issue   (after setting CERTBOT_IP in .env)"
