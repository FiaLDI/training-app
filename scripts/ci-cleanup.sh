#!/usr/bin/env bash
# Safe disk cleanup on hosts running Docker (+ Jenkins and/or production).
# Does NOT stop running containers or remove named volumes.
#
# Usage:
#   bash scripts/ci-cleanup.sh                          # general / production
#   bash scripts/ci-cleanup.sh --agent                  # Jenkins agent before build
#   bash scripts/ci-cleanup.sh --aggressive             # also prune unused images
#   bash scripts/ci-cleanup.sh --keep-tags 24,23        # never remove these tags
set -euo pipefail

AGGRESSIVE=0
AGENT=0
SKIP_ARTIFACTS=0
SKIP_BUILDER_PRUNE=0
DEPLOY_PATH="${DEPLOY_PATH:-/opt/training-app}"
BACKEND_IMAGE="${BACKEND_IMAGE:-workout-backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-workout-frontend}"
KEEP_ARTIFACTS="${KEEP_ARTIFACTS:-3}"
KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-3}"
KEEP_TAGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aggressive) AGGRESSIVE=1; shift ;;
    --agent)
      AGENT=1
      SKIP_ARTIFACTS=1
      KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-5}"
      shift
      ;;
    --skip-artifacts) SKIP_ARTIFACTS=1; shift ;;
    --skip-builder-prune) SKIP_BUILDER_PRUNE=1; shift ;;
    --deploy-path) DEPLOY_PATH="$2"; shift 2 ;;
    --keep-image-tags) KEEP_IMAGE_TAGS="$2"; shift 2 ;;
    --keep-tags)
      IFS=',' read -r -a KEEP_TAGS <<< "$2"
      shift 2
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

tag_is_protected() {
  local tag="$1"
  [[ -z "$tag" || "$tag" == "<none>" ]] && return 0
  for protected in "${KEEP_TAGS[@]}"; do
    [[ -n "$protected" && "$tag" == "$protected" ]] && return 0
  done
  return 1
}

echo "===== Before ====="
df -h / /var/lib/docker 2>/dev/null || df -h /
docker system df 2>/dev/null || true
echo

if [[ "$SKIP_BUILDER_PRUNE" -eq 0 ]]; then
  echo "1) Docker build cache…"
  docker builder prune -af || true
else
  echo "1) Skip builder prune"
fi

echo "2) Dangling images / stopped containers / unused networks…"
docker container prune -f || true
docker network prune -f || true
docker image prune -f || true

echo "3) Old ${BACKEND_IMAGE}/${FRONTEND_IMAGE} tags (keep newest ${KEEP_IMAGE_TAGS} + --keep-tags)…"
for repo in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
  mapfile -t tags < <(docker images "$repo" --format '{{.CreatedAt}}\t{{.Tag}}' | sort -r | awk '{print $NF}')
  idx=0
  for tag in "${tags[@]}"; do
    tag_is_protected "$tag" && continue
    [[ -z "$tag" || "$tag" == "<none>" ]] && continue
    idx=$((idx + 1))
    if [[ "$idx" -gt "$KEEP_IMAGE_TAGS" ]]; then
      echo "  docker rmi ${repo}:${tag}"
      docker rmi "${repo}:${tag}" 2>/dev/null || true
    else
      echo "  keep ${repo}:${tag}"
    fi
  done
  for protected in "${KEEP_TAGS[@]}"; do
    [[ -n "$protected" ]] && echo "  protected ${repo}:${protected}"
  done
done

if [[ "$SKIP_ARTIFACTS" -eq 0 ]]; then
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
else
  echo "4) Skip deploy artifacts cleanup"
fi

if [[ "$AGENT" -eq 1 && -d "${WORKSPACE:-}/.deploy" ]]; then
  echo "4b) Old Jenkins workspace artifacts (keep ${KEEP_ARTIFACTS})…"
  mapfile -t arts < <(ls -1t "${WORKSPACE}/.deploy"/workout-images-*.tar.gz 2>/dev/null || true)
  idx=0
  for art in "${arts[@]}"; do
    idx=$((idx + 1))
    if [[ "$idx" -gt "$KEEP_ARTIFACTS" ]]; then
      echo "  rm ${art}"
      rm -f "${art}"
    fi
  done
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
