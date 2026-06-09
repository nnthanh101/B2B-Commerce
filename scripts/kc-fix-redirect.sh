#!/usr/bin/env bash
# kc-fix-redirect.sh — Patch Keycloak medusa client redirectUris to include storefront callback.
# Adds http://localhost:8000/* and http://host.docker.internal:8000/* so the vymalo OIDC
# provider's redirect_uri=http://localhost:8000/nz/account/auth-callback is accepted.
#
# Uses jq (not node) so it runs cleanly on the host without pnpm / Node in path.
# Idempotent: safe to re-run — the PUT replaces the full redirectUris array.
#
# Usage:
#   bash scripts/kc-fix-redirect.sh
#
set -euo pipefail

KC_BASE="http://localhost:8080"
REALM="medusa-commerce"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

echo "=== kc-fix-redirect.sh — Patching Keycloak medusa client redirectUris ==="
echo "KC_BASE : ${KC_BASE}"
echo "Realm   : ${REALM}"
echo ""

# ── Step 1: Get admin token ──────────────────────────────────────────────────
echo "[1/5] Acquiring admin token..."
TOKEN_RESPONSE=$(curl -s -f -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=admin-cli" \
  --data-urlencode "username=${ADMIN_USER}" \
  --data-urlencode "password=${ADMIN_PASS}")

TOKEN=$(echo "${TOKEN_RESPONSE}" | jq -r '.access_token // empty')
if [ -z "${TOKEN}" ]; then
  echo "ERROR: Failed to acquire admin token. Response:"
  echo "${TOKEN_RESPONSE}" | jq . 2>/dev/null || echo "${TOKEN_RESPONSE}"
  exit 1
fi
echo "  Token acquired (${#TOKEN} chars)."

# ── Step 2: Get medusa client UUID ───────────────────────────────────────────
echo "[2/5] Fetching medusa client..."
CLIENT_RESPONSE=$(curl -s -f \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=medusa")

CLIENT_UUID=$(echo "${CLIENT_RESPONSE}" | jq -r '.[0].id // empty')
if [ -z "${CLIENT_UUID}" ]; then
  echo "ERROR: Could not find medusa client. Response:"
  echo "${CLIENT_RESPONSE}" | jq . 2>/dev/null || echo "${CLIENT_RESPONSE}"
  exit 1
fi
echo "  Client UUID: ${CLIENT_UUID}"

# ── Step 3: Show current redirectUris ────────────────────────────────────────
echo "[3/5] Current redirectUris:"
CURRENT_URIS=$(echo "${CLIENT_RESPONSE}" | jq -r '.[0].redirectUris[]' || true)
echo "${CURRENT_URIS}" | sed 's/^/  - /'

# ── Step 4: PUT updated client representation ────────────────────────────────
echo "[4/5] Patching redirectUris..."

# Build the full updated client JSON by merging the existing client with new redirectUris/webOrigins.
# Using the full existing representation ensures we don't clobber other fields.
UPDATED_CLIENT=$(echo "${CLIENT_RESPONSE}" | jq '
  .[0]
  | .redirectUris = [
      "http://localhost:9000/auth/user/vymalo-keycloak/callback",
      "http://localhost:9000/auth/customer/vymalo-keycloak/callback",
      "http://localhost:9000/*",
      "http://localhost:8000/*",
      "http://localhost:8000/nz/account/auth-callback",
      "http://host.docker.internal:8000/*",
      "http://host.docker.internal:8000/nz/account/auth-callback"
    ]
  | .webOrigins = ["+"]
  | .attributes["pkce.code.challenge.method"] = ""
')

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${KC_BASE}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -d "${UPDATED_CLIENT}")

if [ "${HTTP_STATUS}" != "204" ]; then
  echo "ERROR: PUT returned HTTP ${HTTP_STATUS} (expected 204)"
  # Re-run to get body for diagnostics
  curl -s -X PUT \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${KC_BASE}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
    -d "${UPDATED_CLIENT}"
  exit 1
fi
echo "  PUT returned 204 — success."

# ── Step 5: Verify ───────────────────────────────────────────────────────────
echo "[5/5] Verifying updated redirectUris..."
VERIFY_RESPONSE=$(curl -s -f \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=medusa")

UPDATED_URIS=$(echo "${VERIFY_RESPONSE}" | jq -r '.[0].redirectUris[]' || true)
echo "  New redirectUris:"
echo "${UPDATED_URIS}" | sed 's/^/    - /'

# Confirm the storefront URI is present
if echo "${UPDATED_URIS}" | grep -q "localhost:8000"; then
  echo ""
  echo "  CONFIRMED: localhost:8000/* is in redirectUris."
else
  echo ""
  echo "ERROR: localhost:8000/* NOT found in redirectUris after PUT. Aborting."
  exit 1
fi

# Quick sanity: test the auth endpoint with the storefront redirect_uri
echo ""
echo "Sanity check: auth endpoint with storefront redirect_uri..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${KC_BASE}/realms/${REALM}/protocol/openid-connect/auth?response_type=code&client_id=medusa&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fnz%2Faccount%2Fauth-callback&scope=openid&state=kc-fix-test")
echo "  Auth endpoint HTTP status: ${AUTH_STATUS} (expect 200)"
if [ "${AUTH_STATUS}" = "200" ]; then
  echo "  AUTH ENDPOINT OK — redirectUris patch is active."
elif [ "${AUTH_STATUS}" = "302" ]; then
  echo "  AUTH ENDPOINT OK (302 redirect to login — expected)."
else
  echo "  WARNING: unexpected auth status ${AUTH_STATUS}"
fi

echo ""
echo "=== kc-fix-redirect.sh complete — redirectUris patched. ==="
echo "Before: only localhost:9000/*"
echo "After : includes localhost:8000/* and host.docker.internal:8000/*"
echo ""
echo "Next: bash scripts/run-sso-proof.sh"
