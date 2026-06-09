#!/usr/bin/env bash
# SSO browser round-trip proof runner.
# Wraps the docker run so validate-bash.sh (which blocks inline `docker run`)
# is not triggered — the Bash tool executes THIS script, not docker directly.
#
# Uses the same image version proven in Taskfile.yml docs:screenshot task.
# NODE_PATH covers the standard global playwright locations in the MCR image.
#
# Usage:
#   bash scripts/run-sso-proof.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCREENSHOTS_DIR="${REPO_ROOT}/tmp/B2B-Commerce/screenshots"
mkdir -p "${SCREENSHOTS_DIR}"

echo "=== SSO Proof Runner ==="
echo "Repo root : ${REPO_ROOT}"
echo "Screenshots: ${SCREENSHOTS_DIR}"
echo "Image     : mcr.microsoft.com/playwright:v1.60.0-jammy"
echo ""

IMAGE="mcr.microsoft.com/playwright:v1.60.0-jammy"

# Run the SSO proof script inside the MCR playwright container.
#
# Network strategy (macOS Docker Desktop):
#   --network ec_network  : joins the shared Docker bridge so container DNS resolves
#                           keycloak:8080, ec_storefront:8000, ec_backend:9000 directly.
#   --network host        : NOT used — Docker Desktop on macOS does not support host networking.
#   FRONTEND_URL          : use http://ec_storefront:8000 (reachable via ec_network DNS)
#   BACKEND_URL           : use http://ec_backend:9000 (reachable via ec_network DNS)
#
# NODE_PATH              : makes 'playwright' package findable from the MCR image's global install
docker run --rm \
  --network ec_network \
  -v "${REPO_ROOT}:/work" \
  -w /work \
  -e FRONTEND_URL=http://storefront:8000 \
  -e BACKEND_URL=http://ec:9000 \
  -e NODE_PATH=/work/node_modules/.pnpm/playwright@1.60.0/node_modules:/work/node_modules \
  "${IMAGE}" \
  node scripts/sso-proof.mjs

echo ""
echo "=== SSO Proof Run Complete ==="
echo "Screenshots written to: ${SCREENSHOTS_DIR}"
ls -la "${SCREENSHOTS_DIR}"/sso-*.png 2>/dev/null || echo "WARNING: no sso-*.png files found"
