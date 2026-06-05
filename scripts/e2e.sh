#!/usr/bin/env bash
# scripts/e2e.sh
# Tier 3b — Playwright E2E runner.
# Exits 1 if the backend is unreachable (closes the false-green silent-skip).
#
# Usage: bash scripts/e2e.sh [BACKEND_URL] [REPORT_DIR] [REPO_ROOT]
# Defaults match docker-compose local setup.

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

BACKEND_URL="${1:-http://localhost:9000}"
REPORT_DIR="${2:-tmp/Digital-Commerce/test-results}"
REPO_ROOT="${3:-.}"

# Gate: backend must be up — exit 1 if not (preserves AC1 from v1-DC-CG-taskfile-2026-06-05)
if ! curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
  fail "e2e: backend not reachable at ${BACKEND_URL} — run 'task up' first"
fi

mkdir -p "${REPO_ROOT}/${REPORT_DIR}"

log "Running Playwright E2E tests..."
PLAYWRIGHT_JSON_OUTPUT_NAME="${REPO_ROOT}/${REPORT_DIR}/playwright-json-results.json" \
  npx playwright test "${REPO_ROOT}/tests/e2e/" --reporter=json,html || true
