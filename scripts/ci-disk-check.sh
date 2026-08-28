#!/usr/bin/env bash
# Fail fast when the host is too full for docker build/export.
#
# Usage:
#   bash scripts/ci-disk-check.sh          # default: 2.5 GB
#   bash scripts/ci-disk-check.sh 3        # require at least 3 GB free on /
set -euo pipefail

MIN_GB="${1:-2.5}"
min_mb="$(awk "BEGIN {printf \"%.0f\", ${MIN_GB} * 1024}")"

avail_mb="$(df -BM / | awk 'NR==2 {gsub(/M/,""); print $4}')"
if [[ -z "$avail_mb" || ! "$avail_mb" =~ ^[0-9]+$ ]]; then
  echo "FATAL: could not read free space on /" >&2
  df -h / >&2 || true
  exit 1
fi

if [[ "$avail_mb" -lt "$min_mb" ]]; then
  avail_gb="$(awk "BEGIN {printf \"%.1f\", ${avail_mb} / 1024}")"
  echo "FATAL: only ${avail_gb}G free on / (need >= ${MIN_GB}G)" >&2
  df -h / >&2 || true
  docker system df >&2 || true
  exit 1
fi

avail_gb="$(awk "BEGIN {printf \"%.1f\", ${avail_mb} / 1024}")"
echo "Disk OK: ${avail_gb}G free (minimum ${MIN_GB}G)"
df -h / || true
