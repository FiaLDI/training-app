#!/usr/bin/env bash
# Safe disk cleanup on hosts running Docker (+ Jenkins and/or production).
# Never stops running containers or removes named volumes.
#
# Usage:
#   bash scripts/ci-cleanup.sh
#   bash scripts/ci-cleanup.sh --agent
#   bash scripts/ci-cleanup.sh --aggressive
#   bash scripts/ci-cleanup.sh --deploy-path ~/training-app --keep-tags 20
set -euo pipefail

AGGRESSIVE=0
AGENT=0
SKIP_ARTIFACTS=0
SKIP_BUILDER_PRUNE=0
DEPLOY_PATH="${DEPLOY_PATH:-}"
BACKEND_IMAGE="${BACKEND_IMAGE:-workout-backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-workout-frontend}"
KEEP_ARTIFACTS="${KEEP_ARTIFACTS:-2}"
KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-2}"
KEEP_TAGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aggressive) AGGRESSIVE=1; shift ;;
    --agent)
      AGENT=1
      SKIP_ARTIFACTS=1
      KEEP_IMAGE_TAGS=2
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

# Resolve deploy path: explicit > cwd if it looks like the app > common defaults
if [[ -z "$DEPLOY_PATH" ]]; then
  if [[ -f .env && -f docker-compose.yml ]]; then
    DEPLOY_PATH="$(pwd)"
  elif [[ -d /opt/training-app ]]; then
    DEPLOY_PATH=/opt/training-app
  elif [[ -d "${HOME}/training-app" ]]; then
    DEPLOY_PATH="${HOME}/training-app"
  else
    DEPLOY_PATH="$(pwd)"
  fi
fi

# Images currently used by any container (running or stopped) — never delete.
declare -A IN_USE=()
while read -r img; do
  [[ -n "$img" ]] && IN_USE["$img"]=1
done < <(docker ps -a --format '{{.Image}}' 2>/dev/null || true)

image_in_use() {
  local ref="$1"
  [[ -n "${IN_USE[$ref]:-}" ]] && return 0
  # Also match by image id if ref is name:tag
  local id
  id="$(docker images -q "$ref" 2>/dev/null | head -1 || true)"
  [[ -z "$id" ]] && return 1
  while read -r running_id; do
    [[ -n "$running_id" && "$running_id" == "$id"* ]] && return 0
  done < <(docker ps -a --format '{{.ImageID}}' 2>/dev/null | sed 's/^sha256://' || true)
  return 1
}

tag_is_protected() {
  local tag="$1"
  for protected in "${KEEP_TAGS[@]}"; do
    [[ -n "$protected" && "$tag" == "$protected" ]] && return 0
  done
  return 1
}

echo "===== Before ====="
df -h / 2>/dev/null || true
docker system df 2>/dev/null || true
echo "Deploy path: ${DEPLOY_PATH}"
echo "In-use images:"
docker ps --format '  {{.Names}} → {{.Image}}' 2>/dev/null || true
echo

if [[ "$SKIP_BUILDER_PRUNE" -eq 0 ]]; then
  echo "1) Docker build cache (often the biggest hog)…"
  docker builder prune -af || true
else
  echo "1) Skip builder prune"
fi

echo "2) Stopped containers / unused networks / dangling layers…"
docker container prune -f || true
docker network prune -f || true
docker image prune -f || true

echo "3) Old app tags (keep ${KEEP_IMAGE_TAGS} newest unused + protected + in-use)…"
for repo in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
  # Prefer numeric build tags (newest first); fall back to CreatedAt.
  mapfile -t tags < <(
    docker images "$repo" --format '{{.Tag}}' 2>/dev/null \
      | grep -E '^[0-9]+$' \
      | sort -nr
  )
  if [[ ${#tags[@]} -eq 0 ]]; then
    mapfile -t tags < <(
      docker images "$repo" --format '{{.CreatedAt}}|{{.Tag}}' 2>/dev/null \
        | sort -r \
        | awk -F'|' '{print $2}'
    )
  fi

  kept=0
  for tag in "${tags[@]}"; do
    [[ -z "$tag" || "$tag" == "<none>" ]] && continue
    ref="${repo}:${tag}"

    if image_in_use "$ref" || tag_is_protected "$tag"; then
      echo "  keep ${ref} (in-use/protected)"
      continue
    fi

    kept=$((kept + 1))
    if [[ "$kept" -le "$KEEP_IMAGE_TAGS" ]]; then
      echo "  keep ${ref} (rollback slot ${kept}/${KEEP_IMAGE_TAGS})"
    else
      echo "  docker rmi ${ref}"
      docker rmi "$ref" 2>/dev/null || true
    fi
  done
done

echo "3b) Legacy training-app-* images (if not in use)…"
for ref in $(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E '^training-app-(backend|frontend):' || true); do
  if image_in_use "$ref"; then
    echo "  keep ${ref} (in-use)"
  else
    echo "  docker rmi ${ref}"
    docker rmi "$ref" 2>/dev/null || true
  fi
done

if [[ "$SKIP_ARTIFACTS" -eq 0 ]]; then
  echo "4) Deploy artifacts in ${DEPLOY_PATH}/.deploy (keep ${KEEP_ARTIFACTS})…"
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
    echo "  (no ${DEPLOY_PATH}/.deploy)"
  fi
else
  echo "4) Skip deploy-path artifacts"
fi

echo "4b) Loose image tarballs in workspace / deploy root…"
for dir in "${WORKSPACE:-}" "${DEPLOY_PATH}" "$(pwd)"; do
  [[ -z "$dir" || ! -d "$dir" ]] && continue
  for art in "$dir"/workout-images-*.tar "$dir"/workout-images-*.tar.gz; do
    [[ -e "$art" ]] || continue
    echo "  rm ${art}"
    rm -f "$art"
  done
done

if [[ "$AGGRESSIVE" -eq 1 ]]; then
  echo "5) Aggressive: all unused images (still keeps anything attached to a container)…"
  docker image prune -a -f || true
else
  echo "5) Skip full unused-image prune (pass --aggressive)"
fi

echo
echo "===== After ====="
df -h / 2>/dev/null || true
docker system df 2>/dev/null || true
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' 2>/dev/null || true
echo "Cleanup done. Running containers were not touched."
