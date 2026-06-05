#!/usr/bin/env bash
# scripts/preflight-backend.sh
# Pre-flight gate: verify backend is reachable before any test tier runs.
# Exits 1 (non-zero) when backend is down — blocks e2e/live/idem from false-greening.
#
# Usage: bash scripts/preflight-backend.sh [URL]
# Default URL: http://localhost:9000

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

BACKEND_URL="${1:-http://localhost:9000}"

if ! curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
  fail "Backend not reachable at ${BACKEND_URL} — run 'task up' first"
fi

log "Backend health check passed: ${BACKEND_URL}"
