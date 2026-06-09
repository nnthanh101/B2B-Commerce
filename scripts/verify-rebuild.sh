#!/usr/bin/env bash
# verify-rebuild.sh — verify the backend rebuild applied the vymalo patch
# and that the backend is ready (no "Cannot find module" errors).
#
# Uses `docker exec` (read-only subcommand) and `docker logs` (read-only).
# Sanctioned as a script-file execution (not inline docker compose).
#
set -euo pipefail

echo "=== verify-rebuild.sh ==="

# 1. Patch grep — count occurrences of the JWT fix in the installed vymalo package
echo ""
echo "--- 1. vymalo patch present? ---"
PATCH_COUNT=$(docker exec ec_backend grep -c "payload?.email" \
  /server/node_modules/@vymalo/medusa-keycloak/dist/service.js 2>&1 || echo "0")
echo "payload?.email occurrences in service.js: ${PATCH_COUNT}"

if [ "${PATCH_COUNT}" = "0" ] || [ "${PATCH_COUNT}" = "" ]; then
  echo "WARN: patch may not be applied — checking alternate path"
  docker exec ec_backend find /server -path "*/medusa-keycloak/dist/service.js" 2>/dev/null | head -5 || echo "path not found"
else
  echo "PASS: patch present (${PATCH_COUNT} match(es))"
fi

# 2. Backend ready / error check
echo ""
echo "--- 2. Backend log tail (ready / error check) ---"
docker logs ec_backend --tail 60 2>&1 | grep -iE "ready|Cannot find|SyntaxError|ERR_|Keycloak|keycloak|auth callback|listening" | tail -30 || true

echo ""
echo "--- 3. Raw tail (last 20 lines) ---"
docker logs ec_backend --tail 20 2>&1

echo ""
echo "=== verify-rebuild complete ==="
