#!/usr/bin/env bash
# Safe disk/memory cleanup on the host that runs Docker + Jenkins.
# Does NOT stop running containers or remove named volumes.
#
# Usage (on the server, from repo root or anywhere):
#   bash scripts/ci-cleanup.sh
#   bash scripts/ci-cleanup.sh --aggressive   # also prune unused images not referenced by any container
set -euo pipefail

AGGRESSIVE=0
DEPLOY_PATH="${DEPLOY_PATH:-/opt/training-app}"
BACKEND_IMAGE="${BACKEND_IMAGE:-workout-backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-workout-frontend}"
KEEP_ARTIFACTS="${KEEP_ARTIFACTS:-3}"
KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-3}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aggressive) AGGRESSIVE=1; shift ;;
    --deploy-path) DEPLOY_PATH="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

echo "===== Before ====="
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df 2>/dev/null || true
echo

echo "1) Docker build cache…"
docker builder prune -af || true

echo "2) Dangling images / stopped containers / unused networks…"
docker container prune -f || true
docker network prune -f || true
docker image prune -f || true

echo "3) Old workout-* image tags (keep newest ${KEEP_IMAGE_TAGS})…"
for repo in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
  mapfile -t tags < <(docker images "$repo" --format '{{.CreatedAt}}\t{{.Tag}}' | sort -r | awk '{print $NF}')
  idx=0
  for tag in "${tags[@]}"; do
    [[ -z "$tag" || "$tag" == "<none>" ]] && continue
    idx=$((idx + 1))
    if [[ "$idx" -gt "$KEEP_IMAGE_TAGS" ]]; then
      echo "  docker rmi ${repo}:${tag}"
      docker rmi "${repo}:${tag}" 2>/dev/null || true
    else
      echo "  keep ${repo}:${tag}"
    fi
  done
done

echo "4) Old deploy artifacts in ${DEPLOY_PATH}/.deploy (keep ${KEEP_ARTIFACTS})…"
if [[ -d "${DEPLOY_PATH}/.deploy" ]]; then
  mapfile -t arts < <(ls -1t "${DEPLOY_PATH}/.deploy"/workout-images-*.tar.gz 2>/dev/null || true)
  idx=0
  for art in "${arts[@]}"; do
    idx=$((idx + 1))
    if [[ "$idx" -gt "$KEEP_ARTIFACTS" ]]; then
      echo "  rm ${art}"
      rm -f "${art}"
    else
      echo "  keep ${art}"
    fi
  done
else
  echo "  (no ${DEPLOY_PATH}/.deploy — skip)"
fi

if [[ "$AGGRESSIVE" -eq 1 ]]; then
  echo "5) Aggressive: unused images not referenced by containers…"
  docker image prune -a -f || true
else
  echo "5) Skip aggressive unused-image prune (pass --aggressive to enable)"
fi

echo
echo "===== After ====="
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df 2>/dev/null || true
echo "Cleanup done. Running containers were not touched."
