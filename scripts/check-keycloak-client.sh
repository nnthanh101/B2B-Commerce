#!/usr/bin/env bash
# Reads the Keycloak medusa client configuration to see allowed redirect URIs.
set -euo pipefail

KC_BASE="http://localhost:8080"
REALM="medusa-commerce"

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

echo "=== Keycloak medusa client redirect URIs ==="
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=medusa" \
  | node -e "
    const clients = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (!clients.length) { console.log('No client found'); process.exit(1); }
    const c = clients[0];
    console.log('clientId:', c.clientId);
    console.log('redirectUris:', JSON.stringify(c.redirectUris, null, 2));
    console.log('webOrigins:', JSON.stringify(c.webOrigins, null, 2));
  "
