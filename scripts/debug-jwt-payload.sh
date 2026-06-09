#!/usr/bin/env bash
# debug-jwt-payload.sh — decode the JWT returned by vymalo callback to see its structure
# Makes a fresh auth request and shows the decoded payload
set -euo pipefail

echo "=== Step 1: Get Keycloak auth URL from backend ==="
AUTH_RESP=$(curl -sf -X POST http://localhost:9000/auth/customer/vymalo-keycloak \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)
echo "Auth response: ${AUTH_RESP}"

echo ""
echo "=== Note: To get the JWT, a full OIDC round-trip is needed ==="
echo "=== Checking vymalo service.js for JWT structure ==="
docker exec ec_backend cat "/server/node_modules/.pnpm/@vymalo+medusa-keycloak@1.0.10_patch_hash=af8ab3dfad5a8bdbaf9baf612f39d9a626cf02fe64a23a3c8169940c7c5ab83b/node_modules/@vymalo/medusa-keycloak/dist/service.js" 2>/dev/null | grep -A 5 "entity_id\|payload\|email\|customer" | head -60 || true
