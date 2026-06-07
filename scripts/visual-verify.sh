#!/usr/bin/env bash
# scripts/visual-verify.sh
# Tier 4 visual verification — browser screenshots (Playwright) + terminal capture (screencapture).
# Soft-skip: does NOT exit 1 on missing backend or platform — visual is optional.
#
# Usage: bash scripts/visual-verify.sh [BACKEND_URL] [REPORT_DIR]

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

BACKEND_URL="${1:-http://localhost:9000}"
REPORT_DIR="${2:-tmp/B2B-Commerce/test-results}"

mkdir -p "${REPORT_DIR}/screenshots"

# ── Browser surface (Playwright, headless, no extension required) ─────────────
if curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
  log "Visual-browser: running Playwright screenshot spec..."
  TEST_ADMIN_EMAIL=admin@test.local TEST_ADMIN_PASSWORD=Test1234! \
    npx playwright test tests/e2e/screenshots.spec.ts --project=chromium || true
else
  info "[SKIP] visual-browser: backend not reachable — run 'task up'"
fi

# ── Terminal surface (native macOS screencapture, no MCP required) ───────────
if command -v screencapture >/dev/null 2>&1; then
  WID=$(bash .claude/hooks/scripts/capture-terminal-gif.sh --get-window-id iTerm 2>/dev/null || true)
  if [ -n "$WID" ]; then
    screencapture -l "$WID" -x -o "${REPORT_DIR}/screenshots/VV-terminal-iterm2.png" && \
      log "Terminal capture: $(stat -f%z "${REPORT_DIR}/screenshots/VV-terminal-iterm2.png") bytes"
  else
    screencapture -x -o "${REPORT_DIR}/screenshots/VV-terminal-fullscreen.png" && \
      log "Fullscreen fallback captured"
  fi
else
  info "[SKIP] visual-terminal: screencapture not available (non-macOS)"
fi

ls -la "${REPORT_DIR}/screenshots/VV-"*.png 2>/dev/null || true
