#!/usr/bin/env bash
# check-sso-customer.sh — check if sso.buyer@demo.com exists in the database
set -euo pipefail
echo "=== Checking SSO customer in DB ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "SELECT id, email, created_at FROM customer WHERE email = 'sso.buyer@demo.com';" 2>&1 || true
echo ""
echo "=== All customer emails ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "SELECT id, email FROM customer LIMIT 20;" 2>&1 || true
echo ""
echo "=== Auth identity for vymalo-keycloak ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "SELECT id, provider_id, entity_id, provider_metadata FROM auth_identity WHERE provider_id LIKE '%keycloak%' LIMIT 10;" 2>&1 || true
