#!/usr/bin/env bash
# scripts/lib/common.sh
# Shared helpers for all B2B-Commerce scripts.
# Source this file: source "$(dirname "$0")/lib/common.sh"
#
# Exports: log, info, fail, require_cmd, http_wait

set -euo pipefail

# ── Logging ──────────────────────────────────────────────────────────────────

log()  { echo "[$(date -u +%H:%M:%SZ)] $*"; }
info() { echo "  $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

# ── Dependency guard ─────────────────────────────────────────────────────────

# require_cmd COMMAND [install-hint]
# Exits 1 if the command is not on PATH.
require_cmd() {
  local cmd="$1"
  local hint="${2:-}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    if [ -n "$hint" ]; then
      fail "Required command not found: $cmd  (hint: $hint)"
    else
      fail "Required command not found: $cmd"
    fi
  fi
}

# ── HTTP health-wait ──────────────────────────────────────────────────────────

# http_wait URL [max_tries] [sleep_sec]
# Polls URL until it returns HTTP 2xx.  Exits 1 after max_tries.
http_wait() {
  local url="$1"
  local max="${2:-12}"
  local sleep_sec="${3:-5}"
  local i=0
  log "Waiting for $url (up to $((max * sleep_sec))s)..."
  while [ "$i" -lt "$max" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "Ready: $url"
      return 0
    fi
    i=$((i + 1))
    sleep "$sleep_sec"
  done
  fail "Timed out waiting for $url after $((max * sleep_sec))s"
}
