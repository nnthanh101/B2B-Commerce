#!/usr/bin/env bash
# scripts/lint-test-paths.sh
#
# ACT-TF-005: Fail if any test/CI config contains path anti-patterns that
# escape the repo or embed machine-specific absolute paths.
#
# Checks:
#   1. Bare '../../' sequence in playwright.config.* files.
#      (Catches configs that hard-code a relative escape from repo root.
#       Legitimate programmatic path.resolve(__dirname, "../..") is in
#       tests/e2e/config.ts — NOT in playwright.config.* — and is not flagged.)
#
#   2. Machine-absolute paths (/Volumes/, /Users/, /home/) in any of:
#        playwright.config.*
#        tests/**/*.spec.{ts,js}
#        tests/**/config.{ts,js}
#
# Exits 0 if no violations found.
# Exits 1 if any violation is found (fail-fast: shows all hits first).
#
# Usage:
#   bash scripts/lint-test-paths.sh [REPO_ROOT]
#   (also wired into: task tf:lint:paths)
#
# Coding-discipline R8: use 'grep ... || true' then check count — never
#   'grep -c ... || echo 0' which corrupts output under set -euo pipefail.

set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

VIOLATIONS=0

# ─────────────────────────────────────────────────────────────────────────────
# Check 1: bare '../../' in playwright.config.* (repo-escaping relative paths)
# ─────────────────────────────────────────────────────────────────────────────
# We match only playwright.config.ts / playwright.config.js (not helper modules).
# path.resolve(__dirname, "../..") in helper modules is safe and NOT checked here.
#
# Pattern: standalone '../../' — i.e. NOT preceded by 'resolve(' or '__dirname'
# to avoid flagging the legitimate SSOT pattern.
# Implemented as a two-step filter: grep for '../../', pipe to grep -v to exclude
# the safe form.  Both greps use || true (R8).

echo "[lint-test-paths] Check 1: bare ../../ in playwright.config.*"
hits=$(
  grep -rE '\.\./\.\.' \
    "${REPO_ROOT}/playwright.config.ts" \
    "${REPO_ROOT}/playwright.config.js" \
    2>/dev/null || true
)
# Exclude lines that contain the safe programmatic form: path.resolve(..., "../..")
unsafe_hits=$(echo "${hits}" | grep -v 'resolve\s*(' | grep -v '__dirname' || true)
unsafe_hits="${unsafe_hits:-}"

if [ -n "${unsafe_hits}" ]; then
  echo "  [FAIL] bare '../../' found in playwright.config.*:" >&2
  while IFS= read -r ln; do echo "    ${ln}" >&2; done <<_HITS
${unsafe_hits}
_HITS
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "  [OK]   no bare ../../ in playwright.config.*"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 2: machine-absolute paths in playwright.config.* + test configs/specs
# ─────────────────────────────────────────────────────────────────────────────
echo "[lint-test-paths] Check 2: machine-absolute paths in test files"

# Build file list: playwright.config.*, tests/**/*.spec.ts, tests/**/config.ts
# find exits 0 even if no files match; compatible with bash 3.2 (macOS).
TARGET_FILES=$(
  find "${REPO_ROOT}" \
    \( -name "playwright.config.ts" -o -name "playwright.config.js" \) \
    -o \
    \( -path "${REPO_ROOT}/tests/*" \
       \( -name "*.spec.ts" -o -name "*.spec.js" \
          -o -name "config.ts" -o -name "config.js" \) \) \
    2>/dev/null || true
)

if [ -z "${TARGET_FILES}" ]; then
  echo "  [SKIP] no matching files found"
else
  # Pass file list via xargs — handles spaces and is bash 3.2 compatible.
  abs_hits=$(
    echo "${TARGET_FILES}" | xargs grep -lE '/Volumes/|/Users/|/home/' 2>/dev/null || true
  )
  abs_hits="${abs_hits:-}"

  if [ -n "${abs_hits}" ]; then
    echo "  [FAIL] machine-absolute path found in test files:" >&2
    while IFS= read -r ln; do echo "    ${ln}" >&2; done <<_HITS
${abs_hits}
_HITS
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "  [OK]   no machine-absolute paths in test files"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
if [ "${VIOLATIONS}" -gt 0 ]; then
  echo ""
  echo "[lint-test-paths] BLOCKED: ${VIOLATIONS} path anti-pattern(s) found." >&2
  echo "  Fix: use relative paths from __dirname or environment variables instead." >&2
  exit 1
fi

echo "[lint-test-paths] All path checks passed."
