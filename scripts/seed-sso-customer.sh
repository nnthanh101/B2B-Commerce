#!/usr/bin/env bash
# seed-sso-customer.sh — create SSO buyer customer and link auth identity
# Uses the Medusa admin API to create the customer then link the auth identity
set -euo pipefail

BACKEND_URL="http://localhost:9000"
SSO_EMAIL="sso.buyer@demo.com"
SSO_FIRST="SSO"
SSO_LAST="Buyer"

echo "=== Seed SSO Customer ==="

# Step 1: Get admin JWT
echo "Step 1: Admin login..."
ADMIN_TOKEN=$(curl -sf -X POST "${BACKEND_URL}/auth/user/emailpass" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"Test1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [ -z "${ADMIN_TOKEN}" ]; then
  echo "ERROR: Could not get admin token"
  exit 1
fi
echo "  Admin token obtained"

# Step 2: Check if customer already exists
echo "Step 2: Check existing customer..."
EXISTING=$(curl -sf "${BACKEND_URL}/admin/customers?email=${SSO_EMAIL}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('customers',[{}])[0].get('id','') if d.get('customers') else '')" 2>/dev/null || echo "")

if [ -n "${EXISTING}" ]; then
  echo "  Customer already exists: ${EXISTING}"
  CUSTOMER_ID="${EXISTING}"
else
  # Step 3: Create the customer via admin API
  echo "Step 3: Create customer ${SSO_EMAIL}..."
  CREATE_RESP=$(curl -sf -X POST "${BACKEND_URL}/admin/customers" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${SSO_EMAIL}\",\"first_name\":\"${SSO_FIRST}\",\"last_name\":\"${SSO_LAST}\"}" 2>&1)
  echo "  Create response: ${CREATE_RESP}"
  CUSTOMER_ID=$(echo "${CREATE_RESP}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('customer',{}).get('id',''))" 2>/dev/null || echo "")
  echo "  Customer ID: ${CUSTOMER_ID}"
fi

if [ -z "${CUSTOMER_ID}" ]; then
  echo "ERROR: Could not get customer ID"
  exit 1
fi

# Step 4: Check auth identity for vymalo-keycloak
echo "Step 4: Check auth identity..."
AUTH_ID=$(docker exec ec_postgres psql -U postgres -d ec-store -t -c \
  "SELECT ai.id FROM auth_identity ai JOIN provider_identity pi ON pi.auth_identity_id = ai.id WHERE pi.entity_id = '${SSO_EMAIL}' AND pi.provider = 'vymalo-keycloak' LIMIT 1;" 2>/dev/null | tr -d ' \n' || echo "")
echo "  Auth identity: ${AUTH_ID}"

if [ -n "${AUTH_ID}" ]; then
  # Step 5: Link customer to auth identity
  echo "Step 5: Link customer to auth identity ${AUTH_ID}..."
  docker exec ec_postgres psql -U postgres -d ec-store -c \
    "UPDATE auth_identity SET app_metadata = jsonb_set(COALESCE(app_metadata, '{}'), '{customer_id}', '\"${CUSTOMER_ID}\"') WHERE id = '${AUTH_ID}';" 2>&1
  echo "  Linked customer ${CUSTOMER_ID} to auth identity ${AUTH_ID}"
else
  echo "  No auth identity found yet — SSO user will be linked on first SSO login"
fi

echo ""
echo "=== SSO Customer Ready ==="
echo "  Email     : ${SSO_EMAIL}"
echo "  Customer  : ${CUSTOMER_ID}"
echo "  Auth ID   : ${AUTH_ID:-not-created-yet}"
