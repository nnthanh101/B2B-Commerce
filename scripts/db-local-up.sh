#!/usr/bin/env bash
# scripts/db-local-up.sh
# Provision a local test database on host Postgres (no Docker required).
# Requires: psql on PATH, Postgres running locally on port 5432.
#
# Usage: bash scripts/db-local-up.sh [REPO_ROOT]
# REPO_ROOT defaults to the directory one level above scripts/.

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

require_cmd psql "brew install postgresql@15"

log "Creating test database (ec_store_test) if it does not exist..."
createdb ec_store_test 2>/dev/null || true

log "Running database migrations..."
export DATABASE_URL=postgres://postgres@localhost:5432/ec_store_test
export REDIS_URL=redis://localhost:6379
(cd "${REPO_ROOT}/apps/backend" && npm run db:migrate)

log "Seeding test database..."
(cd "${REPO_ROOT}/apps/backend" && npm run db:seed)

log "Local test database ready: ec_store_test"
