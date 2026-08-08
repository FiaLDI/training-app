#!/usr/bin/env bash
# Obtain a Let's Encrypt IP certificate (short-lived, ~6 days) and enable HTTPS redirect.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${CERTBOT_IP:?Set CERTBOT_IP in .env to your public IPv4 address}"

EMAIL_ARGS=()
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  EMAIL_ARGS=(--email "$CERTBOT_EMAIL")
else
  EMAIL_ARGS=(--register-unsafely-without-email)
  echo "NOTE: CERTBOT_EMAIL is empty — registering without email (no expiry notices from LE)."
fi

if [[ "${APP_PORT:-80}" != "80" ]]; then
  echo "WARNING: APP_PORT=${APP_PORT}. Let's Encrypt HTTP-01 needs port 80 reachable on ${CERTBOT_IP}."
  echo "         On the VPS set APP_PORT=80 and HTTPS_PORT=443, open both in the firewall."
fi

mkdir -p certbot/www certbot/conf

HTTP_ONLY="$ROOT/nginx/conf.d/http-only.conf.example"
ACTIVE="$ROOT/nginx/conf.d/default.conf"
HTTPS_TEMPLATE="$ROOT/nginx/conf.d/https.conf.template"
RENEWAL="$ROOT/certbot/conf/renewal/ip.conf"

echo "==> Switching nginx to HTTP-only (ACME challenge)"
cp "$HTTP_ONLY" "$ACTIVE"

echo "==> Ensuring nginx is up (host port ${APP_PORT:-80} → container :80)"
docker compose up -d nginx
# Pick up HTTP-only config before we remove any cert files
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

# Drop dummy cert so certbot can issue a clean lineage
if [[ ! -f "$RENEWAL" ]]; then
  rm -rf certbot/conf/live/ip certbot/conf/archive/ip
fi

echo "==> Waiting for nginx..."
sleep 2

echo "==> Requesting Let's Encrypt certificate for IP ${CERTBOT_IP}"
docker compose --profile ssl run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --ip-address "$CERTBOT_IP" \
  --cert-name ip \
  --preferred-profile shortlived \
  "${EMAIL_ARGS[@]}" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring

echo "==> Enabling HTTPS nginx config (HTTP → HTTPS redirect)"
cp "$HTTPS_TEMPLATE" "$ACTIVE"

docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

echo
echo "Done. Open: https://${CERTBOT_IP}"
echo "Certificate lives ~6 days — renew with: npm run ssl:renew"
echo "Install a host cron every 12h, e.g.:"
echo "  0 */12 * * * cd ${ROOT} && npm run ssl:renew >> /var/log/workout-ssl-renew.log 2>&1"
