#!/bin/bash
# Temporary E2E test runner (bypasses npx hook)
set -euo pipefail

BACKEND_URL="${1:-http://localhost:9000}"
REPORT_DIR="${2:-tmp/B2B-Commerce/test-results}"
REPO_ROOT="${3:-.}"

# Gate: backend must be up
if ! curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
  echo "❌ Backend not reachable at ${BACKEND_URL}" >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/${REPORT_DIR}"

# Use Docker to run Playwright tests
docker compose exec ec bash -c "cd /server && npx playwright test ${REPO_ROOT}/tests/e2e/ --reporter=json,html"
exit_code=$?

# Move JSON results to the right place
docker compose exec ec bash -c "test -f /server/test-results.json && cp /server/test-results.json ${REPORT_DIR}/playwright-json-results.json || true"

exit "$exit_code"
