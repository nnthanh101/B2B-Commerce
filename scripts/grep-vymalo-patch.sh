#!/usr/bin/env bash
# grep-vymalo-patch.sh — confirm JWT payload?.email patch in installed vymalo package
set -euo pipefail
VYMALO_PATH=$(docker exec ec_backend find /server -name "service.js" -path "*medusa-keycloak*" 2>/dev/null | head -1)
echo "Path: ${VYMALO_PATH}"
COUNT=$(docker exec ec_backend grep -c "payload?.email" "${VYMALO_PATH}" 2>/dev/null || echo "0")
echo "payload?.email occurrences: ${COUNT}"
echo "--- context lines ---"
docker exec ec_backend grep -n "payload" "${VYMALO_PATH}" 2>/dev/null | grep -i "email\|sub\|name" | head -20 || true
