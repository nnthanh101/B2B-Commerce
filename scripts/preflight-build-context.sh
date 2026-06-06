#!/usr/bin/env bash
# scripts/preflight-build-context.sh
#
# Shift-left Docker build-context guard.
#
# Computes the EFFECTIVE build-context size by honouring .dockerignore (via
# tar --exclude-from), then fails fast if:
#   1. Effective context exceeds MAX_CONTEXT_MB (default 50 MB), OR
#   2. Known-heavy directories are present IN-context (not excluded), which
#      would cause the "no space left on device" class of 8+ GB build failure.
#
# Exits 0 on clean context.
# Exits 1 on oversized or contaminated context (with actionable guidance).
#
# Usage:
#   bash scripts/preflight-build-context.sh
#   (also wired into: task preflight:context, task up pre-step)
#
# Requires: tar, find, awk (standard POSIX tools — no auth, no network).
# REPO_ROOT can be overridden for testing:
#   REPO_ROOT=/tmp/fake-repo bash scripts/preflight-build-context.sh

set -euo pipefail

# ── Tunables ─────────────────────────────────────────────────────────────────

MAX_CONTEXT_MB="${MAX_CONTEXT_MB:-50}"

# ── Resolve paths ─────────────────────────────────────────────────────────────

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DOCKERIGNORE="${REPO_ROOT}/.dockerignore"

# ── Dependency guard ─────────────────────────────────────────────────────────

for cmd in tar find awk; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[preflight-context] ERROR: required command not found: $cmd" >&2
    exit 1
  fi
done

if [ ! -f "${DOCKERIGNORE}" ]; then
  echo "[preflight-context] WARNING: no .dockerignore found at ${DOCKERIGNORE}" >&2
  echo "  Proceeding with raw size check only (no exclusions applied)." >&2
fi

# ── Step 1: compute effective context size ────────────────────────────────────
# We stream a tar archive that honours .dockerignore and count bytes.
# This mirrors what the Docker daemon receives on 'docker build .'.
# Note: bsdtar (macOS) and GNU tar both support --exclude-from.

echo "[preflight-context] Computing effective build-context size (honoring .dockerignore)..."

BYTES=0
if [ -f "${DOCKERIGNORE}" ]; then
  BYTES=$(tar --exclude-from="${DOCKERIGNORE}" -cf - -C "${REPO_ROOT}" . 2>/dev/null | wc -c | tr -d ' ')
else
  BYTES=$(tar -cf - -C "${REPO_ROOT}" . 2>/dev/null | wc -c | tr -d ' ')
fi

CONTEXT_MB=$(awk "BEGIN { printf \"%.1f\", ${BYTES}/1048576 }")

echo "  Effective context: ${CONTEXT_MB} MB  (limit: ${MAX_CONTEXT_MB} MB)"

# ── Step 2: check for heavy directories IN-context ────────────────────────────
# These patterns indicate that a heavy dir was NOT excluded by .dockerignore.
# We search for the dirs themselves (not their contents) to keep this fast.
# Each entry: "human label|find pattern"

HEAVY_VIOLATIONS=""

check_in_context() {
  local label="$1"
  local dir_path="$2"
  if [ -d "${REPO_ROOT}/${dir_path}" ]; then
    # The directory exists on disk.  If it is NOT excluded by .dockerignore,
    # tar would have included it — treat existence as a proxy for inclusion.
    # A robust check: verify it IS excluded by looking for it in the tar stream.
    # We use find on the tar output (stream) — instead just check via tar listing:
    local found
    found=$(tar --exclude-from="${DOCKERIGNORE}" -cf - -C "${REPO_ROOT}" . 2>/dev/null \
            | tar -tf - 2>/dev/null \
            | grep -c "^\./${dir_path%/}/" || true)
    found="${found:-0}"
    if [ "${found}" -gt 0 ]; then
      HEAVY_VIOLATIONS="${HEAVY_VIOLATIONS}  ❌  ${label} (${dir_path}) is IN-context — ${found} files leaked\n"
    fi
  fi
}

# Root node_modules
check_in_context "node_modules (root)" "node_modules"

# Known workspace node_modules — paths that exist today
check_in_context "node_modules (apps/backend)" "apps/backend/node_modules"
check_in_context "node_modules (apps/storefront)" "apps/storefront/node_modules"
check_in_context "node_modules (packages/*)" "packages"

# Terraform provider dirs — the 8 GB "no space left" root cause
check_in_context ".terraform (infra)" "infra/terraform/.terraform"

# tfstate files (any) — checked via find rather than a single dir
TFSTATE_COUNT=0
if [ -f "${DOCKERIGNORE}" ]; then
  TFSTATE_COUNT=$(tar --exclude-from="${DOCKERIGNORE}" -cf - -C "${REPO_ROOT}" . 2>/dev/null \
                  | tar -tf - 2>/dev/null \
                  | grep -c '\.tfstate' || true)
fi
TFSTATE_COUNT="${TFSTATE_COUNT:-0}"
if [ "${TFSTATE_COUNT}" -gt 0 ]; then
  HEAVY_VIOLATIONS="${HEAVY_VIOLATIONS}  ❌  *.tfstate / *.tfstate.* files are IN-context — ${TFSTATE_COUNT} file(s) leaked\n"
fi

# ── Step 3: evaluate and report ───────────────────────────────────────────────

FAILED=0

if [ -n "${HEAVY_VIOLATIONS}" ]; then
  echo "" >&2
  echo "[preflight-context] BLOCKED: heavy directory/files found in build-context:" >&2
  printf "%b" "${HEAVY_VIOLATIONS}" >&2
  echo "" >&2
  echo "  Fix: add the pattern(s) to .dockerignore, e.g.:" >&2
  echo "    node_modules" >&2
  echo "    **/node_modules" >&2
  echo "    **/.terraform/" >&2
  echo "    **/*.tfstate" >&2
  echo "    **/*.tfstate.*" >&2
  FAILED=1
fi

if awk "BEGIN { exit (${CONTEXT_MB} > ${MAX_CONTEXT_MB}) ? 0 : 1 }"; then
  echo "" >&2
  echo "[preflight-context] BLOCKED: effective context ${CONTEXT_MB} MB exceeds ${MAX_CONTEXT_MB} MB limit." >&2
  echo "" >&2
  echo "  This guard prevents the '8 GB no space left on device' class of build failure." >&2
  echo "  To diagnose what is contributing to context size, run:" >&2
  echo "    tar --exclude-from=.dockerignore -cf - . | tar -tvf - | awk '{print \$NF, \$3}' | sort -k2 -rn | head -30" >&2
  echo "" >&2
  echo "  Then add large paths to .dockerignore.  Common culprits:" >&2
  echo "    node_modules / **/node_modules  (JS packages)" >&2
  echo "    **/.terraform/                  (Terraform provider binaries)" >&2
  echo "    **/*.tfstate*                   (Terraform state files)" >&2
  echo "    .pnpm-store / .yarn/cache       (Package manager caches)" >&2
  echo "    tests/screenshots/              (E2E screenshot artifacts)" >&2
  echo "    tmp/                            (Temporary evidence files)" >&2
  FAILED=1
fi

if [ "${FAILED}" -eq 0 ]; then
  echo "  [OK] Context size ${CONTEXT_MB} MB is within ${MAX_CONTEXT_MB} MB limit."
  echo "  [OK] No heavy directories found in build-context."
  echo "[preflight-context] Build-context is clean."
  exit 0
fi

echo "[preflight-context] FAILED — fix the issues above before running 'docker build'." >&2
exit 1
