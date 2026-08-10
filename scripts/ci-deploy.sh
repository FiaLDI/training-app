#!/usr/bin/env bash
# Production deploy: load pre-built images, switch IMAGE_TAG, healthcheck, rollback on failure.
# Usage (on production host, from repo root):
#   bash scripts/ci-deploy.sh --image-tag 145 --artifact .deploy/workout-images-145.tar.gz
set -euo pipefail

IMAGE_TAG=""
ARTIFACT=""
BACKEND_IMAGE="${BACKEND_IMAGE:-workout-backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-workout-frontend}"
HEALTH_URL=""
STATE_FILE=".deploy/state"
KEEP_PREVIOUS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image-tag) IMAGE_TAG="$2"; shift 2 ;;
    --artifact) ARTIFACT="$2"; shift 2 ;;
    --health-url) HEALTH_URL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$IMAGE_TAG" || -z "$ARTIFACT" ]]; then
  echo "Usage: $0 --image-tag TAG --artifact path/to/images.tar.gz" >&2
  exit 2
fi

if [[ ! -f "$ARTIFACT" ]]; then
  echo "Artifact not found: $ARTIFACT" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env in $(pwd). Create it from .env.example on the server first." >&2
  exit 1
fi

mkdir -p .deploy
bash scripts/ssl-ensure-dummy.sh

# CLI --image-tag must win over IMAGE_TAG from .env (set -a would overwrite it).
DESIRED_TAG="$IMAGE_TAG"

# Resolve health URL from APP_PORT if not provided
if [[ -z "$HEALTH_URL" ]]; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
  HEALTH_URL="http://127.0.0.1:${APP_PORT:-80}/api/health"
fi
IMAGE_TAG="$DESIRED_TAG"
FRONTEND_URL="${HEALTH_URL%/api/health}/"

previous_tag=""
if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  previous_tag="${CURRENT_TAG:-}"
elif grep -q '^IMAGE_TAG=' .env; then
  previous_tag="$(grep '^IMAGE_TAG=' .env | head -1 | cut -d= -f2-)"
fi

echo "===== Deploy ====="
echo "New IMAGE_TAG:      ${IMAGE_TAG}"
echo "Previous IMAGE_TAG: ${previous_tag:-<none>}"
echo "Artifact:           ${ARTIFACT}"
echo "Health URL:         ${HEALTH_URL}"
echo "=================="

echo "Loading Docker images from artifact…"
gunzip -c "$ARTIFACT" | docker load

set_image_tag() {
  local tag="$1"
  if grep -q '^IMAGE_TAG=' .env; then
    sed -i.bak "s/^IMAGE_TAG=.*/IMAGE_TAG=${tag}/" .env
    rm -f .env.bak
  else
    printf '\nIMAGE_TAG=%s\n' "$tag" >> .env
  fi
  export IMAGE_TAG="$tag"
}

rollback() {
  local reason="$1"
  local failed_tag="$IMAGE_TAG"
  echo "Deployment FAILED: ${reason}" >&2
  if [[ -z "$previous_tag" || "$previous_tag" == "$failed_tag" ]]; then
    echo "Rollback skipped: no previous working tag available." >&2
    return 1
  fi
  if ! docker image inspect "${BACKEND_IMAGE}:${previous_tag}" >/dev/null 2>&1 \
    || ! docker image inspect "${FRONTEND_IMAGE}:${previous_tag}" >/dev/null 2>&1; then
    echo "Rollback skipped: previous images ${previous_tag} are missing." >&2
    return 1
  fi

  echo "ROLLBACK → IMAGE_TAG=${previous_tag}"
  set_image_tag "$previous_tag"
  docker compose up -d --no-build --force-recreate --remove-orphans
  if bash scripts/ci-healthcheck.sh --timeout 90 --url "$HEALTH_URL"; then
    echo "Rollback healthcheck: SUCCESS (running ${previous_tag})"
    cat > "$STATE_FILE" <<EOF
CURRENT_TAG=${previous_tag}
PREVIOUS_TAG=
LAST_FAILED_TAG=${failed_tag}
EOF
  else
    echo "Rollback healthcheck: FAILURE — production may be unhealthy" >&2
  fi
  return 1
}

set_image_tag "$IMAGE_TAG"

echo "Starting stack with IMAGE_TAG=${IMAGE_TAG} (no build on production)…"
docker compose up -d --no-build --force-recreate --remove-orphans

if ! bash scripts/ci-healthcheck.sh --timeout 120 --url "$HEALTH_URL"; then
  rollback "new version failed healthcheck (${HEALTH_URL})" || true
  echo "Jenkins should mark this build as FAILURE." >&2
  exit 1
fi

if ! bash scripts/ci-healthcheck.sh --timeout 60 --url "$FRONTEND_URL" --expect-body ""; then
  rollback "frontend failed healthcheck (${FRONTEND_URL})" || true
  echo "Jenkins should mark this build as FAILURE." >&2
  exit 1
fi

echo "Deployment healthcheck: SUCCESS"

# Persist state: keep current + previous for next rollback
cat > "$STATE_FILE" <<EOF
CURRENT_TAG=${IMAGE_TAG}
PREVIOUS_TAG=${previous_tag}
LAST_FAILED_TAG=
EOF

# Remove temporary artifact on production
rm -f "$ARTIFACT"
echo "Removed temporary artifact ${ARTIFACT}"

# Safe cleanup: drop unused workout-* images except current and previous
echo "Pruning unused app images (keeping current${previous_tag:+ and previous})…"
keep_tags=("${IMAGE_TAG}")
if [[ -n "$previous_tag" && "$KEEP_PREVIOUS" -eq 1 ]]; then
  keep_tags+=("$previous_tag")
fi

for repo in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
  while read -r tag; do
    [[ -z "$tag" || "$tag" == "<none>" ]] && continue
    skip=0
    for k in "${keep_tags[@]}"; do
      if [[ "$tag" == "$k" ]]; then skip=1; break; fi
    done
    if [[ "$skip" -eq 0 ]]; then
      echo "  docker rmi ${repo}:${tag}"
      docker rmi "${repo}:${tag}" 2>/dev/null || true
    fi
  done < <(docker images "$repo" --format '{{.Tag}}')
done

echo "Deploy SUCCESS: ${BACKEND_IMAGE}:${IMAGE_TAG} + ${FRONTEND_IMAGE}:${IMAGE_TAG}"
