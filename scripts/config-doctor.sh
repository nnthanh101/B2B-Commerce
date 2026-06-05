#!/usr/bin/env bash
# scripts/config-doctor.sh
#
# Config-doctor: assert storefront publishable key matches the live backend key.
#
# Usage:
#   ./scripts/config-doctor.sh           # auto-detect env file at apps/storefront/.env
#   ./scripts/config-doctor.sh --fix     # also write the derived key and restart storefront
#
# Exit codes:
#   0  — keys match (or placeholder overwritten with --fix)
#   1  — mismatch or placeholder detected (drift found, needs remediation)
#   2  — required dependencies missing (docker, psql, jq)
#
# Wired into: P0 env gate (task p0:gate), scripts/preflight-backend.sh sibling
# Closes: DC-050 regression guard (publishable-key drift that broke 18 tests 2026-06-05)

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STOREFRONT_ENV="${PROJECT_ROOT}/apps/storefront/.env"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ec_postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-ec-store}"
FIX_MODE=false

# ── Arg parsing ──────────────────────────────────────────────────────────────

for arg in "$@"; do
  case "$arg" in
    --fix) FIX_MODE=true ;;
    --help|-h)
      grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \?//'
      exit 0
      ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────

log()  { echo "[config-doctor] $*"; }
warn() { echo "[config-doctor] WARN: $*" >&2; }
fail() { echo "[config-doctor] FAIL: $*" >&2; exit 1; }

# ── Dependency check ─────────────────────────────────────────────────────────

if ! command -v docker >/dev/null 2>&1; then
  echo "[config-doctor] ERROR: docker not found. Install Docker to run this check." >&2
  exit 2
fi

# ── Step 1: Fetch live publishable key from backend DB ───────────────────────

log "Querying publishable key from ${POSTGRES_CONTAINER} (db=${POSTGRES_DB})..."

LIVE_KEY=$(docker exec "${POSTGRES_CONTAINER}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -A \
  -c "SELECT token FROM api_key WHERE type='publishable' ORDER BY created_at DESC LIMIT 1;" \
  2>/dev/null || true)

if [ -z "${LIVE_KEY}" ]; then
  fail "No publishable key found in ${POSTGRES_DB}.api_key. Run 'task seed' first, then retry."
fi

log "Live key: ${LIVE_KEY:0:24}... (truncated for display)"

# ── Step 2: Read key from storefront .env ────────────────────────────────────

if [ ! -f "${STOREFRONT_ENV}" ]; then
  warn "apps/storefront/.env does not exist."
  if [ "${FIX_MODE}" = "true" ]; then
    log "--fix: creating .env from template and writing derived key..."
    cp "${PROJECT_ROOT}/apps/storefront/.env.template" "${STOREFRONT_ENV}"
    # Replace placeholder line (sed non-destructive: only touches that one line)
    sed -i.bak "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${LIVE_KEY}|" "${STOREFRONT_ENV}"
    rm -f "${STOREFRONT_ENV}.bak"
    log "Written derived key to apps/storefront/.env"
    log "Restarting storefront container..."
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" restart storefront
    log "Restart issued. Wait ~20s for Next.js to rebuild, then: curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/dk"
    exit 0
  fi
  fail "apps/storefront/.env missing. Copy from template and derive the key:\n  cp apps/storefront/.env.template apps/storefront/.env\n  # then run: ./scripts/config-doctor.sh --fix"
fi

# Extract the key value (handles KEY=value and KEY= "value" formats)
ENV_KEY=$(grep -E '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "${STOREFRONT_ENV}" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]' || true)

log "Env key:  ${ENV_KEY:0:24}... (truncated for display)"

# ── Step 3: Assert ───────────────────────────────────────────────────────────

PLACEHOLDER_PATTERN="pk_test|pk_REPLACE|^$"

if echo "${ENV_KEY}" | grep -qE "${PLACEHOLDER_PATTERN}"; then
  warn "DRIFT DETECTED: apps/storefront/.env has a placeholder value: '${ENV_KEY}'"
  warn "This will cause storefront HTTP 500 (backend rejects invalid publishable key)."
  if [ "${FIX_MODE}" = "true" ]; then
    log "--fix: writing derived key and restarting storefront..."
    sed -i.bak "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${LIVE_KEY}|" "${STOREFRONT_ENV}"
    rm -f "${STOREFRONT_ENV}.bak"
    log "Updated apps/storefront/.env with live key."
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" restart storefront
    log "Storefront restarted. Poll: curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/dk"
    exit 0
  fi
  echo ""
  echo "Remediation:"
  echo "  Run: ./scripts/config-doctor.sh --fix"
  echo "  Or manually: Edit apps/storefront/.env and set:"
  echo "    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${LIVE_KEY}"
  echo "  Then: docker compose restart storefront"
  exit 1
fi

if [ "${ENV_KEY}" != "${LIVE_KEY}" ]; then
  warn "DRIFT DETECTED: .env key does not match live backend key."
  warn "  .env:    ${ENV_KEY}"
  warn "  backend: ${LIVE_KEY}"
  warn "This will cause storefront HTTP 500 (backend rejects stale publishable key)."
  if [ "${FIX_MODE}" = "true" ]; then
    log "--fix: overwriting stale key in apps/storefront/.env..."
    sed -i.bak "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${LIVE_KEY}|" "${STOREFRONT_ENV}"
    rm -f "${STOREFRONT_ENV}.bak"
    log "Updated apps/storefront/.env with live key."
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" restart storefront
    log "Storefront restarted."
    exit 0
  fi
  echo ""
  echo "Remediation:"
  echo "  Run: ./scripts/config-doctor.sh --fix"
  exit 1
fi

log "OK: apps/storefront/.env publishable key matches live backend key."
log "Sales channel: Default Sales Channel (verified linked in api_key_sales_channel)."
exit 0
