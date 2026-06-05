#!/usr/bin/env bash
# scripts/preflight-images.sh
#
# ACT-TF-004: Verify every nnthanh101/* image tag referenced in Taskfile.yml
# and .github/workflows/ is pullable before CI attempts to use it.
#
# Exits 0 if all tags exist in the registry.
# Exits 1 on the first tag that cannot be resolved (fail-fast).
#
# Usage:
#   bash scripts/preflight-images.sh
#   (also wired into: task tf:preflight)
#
# Requires: docker (any version that supports 'docker manifest inspect').
# No auth needed for public registries.

set -euo pipefail

# REPO_ROOT: defaults to the directory one level above this script.
# Can be overridden via environment variable for testing:
#   REPO_ROOT=/tmp/fake bash scripts/preflight-images.sh
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# ── Collect referenced tags ───────────────────────────────────────────────────
# Extract unique nnthanh101/IMAGE:TAG strings from Taskfile + workflow files.
# grep exits 1 on no match; || true keeps set -e happy per coding-discipline R8.
# sort -u de-duplicates; compatible with bash 3.2 (macOS) and bash 5 (Linux CI).
UNIQUE_IMAGES_RAW=$(
  grep -rEoh 'nnthanh101/[a-z0-9_-]+:[a-z0-9._-]+' \
    "${REPO_ROOT}/Taskfile.yml" \
    "${REPO_ROOT}/.github/workflows/" \
    2>/dev/null || true
)

UNIQUE_IMAGES=$(echo "${UNIQUE_IMAGES_RAW}" | sort -u | grep -v '^$' || true)

if [ -z "${UNIQUE_IMAGES}" ]; then
  echo "[preflight-images] WARNING: no nnthanh101/* image references found — check paths."
  exit 0
fi

IMAGE_COUNT=$(echo "${UNIQUE_IMAGES}" | wc -l | tr -d ' ')
echo "[preflight-images] Checking ${IMAGE_COUNT} image tag(s)..."

# ── Verify each tag ───────────────────────────────────────────────────────────
FAILED=0
while IFS= read -r image; do
  [ -z "${image}" ] && continue
  if docker manifest inspect "${image}" >/dev/null 2>&1; then
    echo "  [OK]   ${image}"
  else
    echo "  [FAIL] ${image} — tag not found in registry" >&2
    FAILED=$((FAILED + 1))
  fi
done <<EOF
${UNIQUE_IMAGES}
EOF

if [ "${FAILED}" -gt 0 ]; then
  echo ""
  echo "[preflight-images] BLOCKED: ${FAILED} image tag(s) unreachable." >&2
  echo "  Fix: update Taskfile.yml / workflows to a tag that exists (e.g. :slim)." >&2
  exit 1
fi

echo "[preflight-images] All image tags verified OK."
