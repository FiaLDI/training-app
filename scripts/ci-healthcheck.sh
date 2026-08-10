#!/usr/bin/env bash
# Wait until an HTTP endpoint responds successfully.
# Usage:
#   scripts/ci-healthcheck.sh --url URL [--timeout SECONDS] [--expect-body SUBSTRING]
set -euo pipefail

URL=""
TIMEOUT=90
EXPECT_BODY="ok"
INTERVAL=3

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --expect-body) EXPECT_BODY="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$URL" ]]; then
  echo "Usage: $0 --url URL [--timeout N] [--expect-body TEXT]" >&2
  exit 2
fi

deadline=$((SECONDS + TIMEOUT))
echo "Healthcheck: waiting for ${URL} (timeout=${TIMEOUT}s)"

while (( SECONDS < deadline )); do
  body="$(curl -fsS --max-time 5 "$URL" 2>/dev/null || true)"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$URL" 2>/dev/null || echo 000)"

  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    if [[ -z "$EXPECT_BODY" ]] || [[ "$body" == *"$EXPECT_BODY"* ]]; then
      echo "Healthcheck OK: HTTP ${code} ${URL}"
      exit 0
    fi
  fi

  echo "  … not ready (HTTP ${code}), retry in ${INTERVAL}s"
  sleep "$INTERVAL"
done

echo "Healthcheck FAILED: ${URL} did not become healthy within ${TIMEOUT}s" >&2
exit 1
