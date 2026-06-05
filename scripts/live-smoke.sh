#!/usr/bin/env bash
# scripts/live-smoke.sh
# Tier 3a-live — HTTP integration smoke against the RUNNING backend.
# Creates an admin user (idempotent) then runs the live-api-smoke jest suite.
# Exits 1 if the backend is unreachable.
#
# Usage: bash scripts/live-smoke.sh [BACKEND_URL] [ADMIN_EMAIL] [ADMIN_PW]

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

BACKEND_URL="${1:-http://localhost:9000}"
ADMIN_EMAIL="${2:-admin@test.local}"
ADMIN_PW="${3:-Test1234!}"

# Gate: backend must be up — exit 1 if not (preserves AC1 from v1-DC-CG-taskfile-2026-06-05)
if ! curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
  fail "live: backend not reachable at ${BACKEND_URL} — run 'task up' first"
fi

log "Creating admin user (idempotent)..."
docker compose exec -T ec sh -c \
  "cd /server/apps/backend && npx medusa user -e ${ADMIN_EMAIL} -p ${ADMIN_PW}" \
  2>/dev/null || true

log "Running live API smoke suite..."
docker compose exec -T ec sh -c \
  "cd /server/apps/backend && ADMIN_EMAIL=${ADMIN_EMAIL} ADMIN_PW=${ADMIN_PW} \
   npx jest --runInBand --forceExit integration-tests/live/live-api-smoke.spec.ts"
