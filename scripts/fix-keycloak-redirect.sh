#!/usr/bin/env bash
# Adds http://localhost:8000/* to the Keycloak medusa client's allowed redirect URIs.
# This is required for the SSO round-trip when KEYCLOAK_CALLBACK_URL points to the
# storefront (localhost:8000) rather than the Medusa backend (localhost:9000).
set -euo pipefail

KC_BASE="http://localhost:8080"
REALM="medusa-commerce"

echo "=== Fixing Keycloak medusa client redirect URIs ==="

# Get admin token
TOKEN=$(curl -s -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=admin-cli" \
  --data-urlencode "username=admin" \
  --data-urlencode "password=admin" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).access_token || '')")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get admin token"
  exit 1
fi
echo "Admin token acquired."

# Get medusa client ID (internal UUID)
CLIENT_DATA=$(curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=medusa")

CLIENT_UUID=$(node -e "
  const clients = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(clients[0]?.id || '');
" <<< "${CLIENT_DATA}")

if [ -z "$CLIENT_UUID" ]; then
  echo "ERROR: Could not find medusa client UUID"
  exit 1
fi
echo "Client UUID: ${CLIENT_UUID}"

# Update redirect URIs to include storefront URLs
echo "Updating redirect URIs..."
curl -s -X PUT \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${KC_BASE}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -d '{
    "redirectUris": [
      "http://localhost:9000/auth/user/vymalo-keycloak/callback",
      "http://localhost:9000/*",
      "http://localhost:9000/auth/customer/vymalo-keycloak/callback",
      "http://localhost:8000/*",
      "http://localhost:8000/nz/account/auth-callback",
      "http://host.docker.internal:8000/*"
    ],
    "webOrigins": ["+"]
  }'

echo ""
echo "Done. Verifying..."

# Verify the update
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=medusa" \
  | node -e "
    const clients = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log('Updated redirectUris:', JSON.stringify(clients[0]?.redirectUris, null, 2));
  "

# Test the auth URL
echo ""
echo "Testing authorization URL with localhost:8000 redirect..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${KC_BASE}/realms/${REALM}/protocol/openid-connect/auth?response_type=code&client_id=medusa&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fnz%2Faccount%2Fauth-callback&scope=openid&state=test123")
echo "HTTP status for auth URL: ${HTTP_CODE} (expect 200 = redirect to login form)"
