#!/usr/bin/env bash
# check-provider-identity.sh — check provider_identity for keycloak entries
set -euo pipefail
echo "=== provider_identity table ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "\d provider_identity" 2>&1 || true
echo ""
echo "=== provider_identity rows ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "SELECT * FROM provider_identity ORDER BY created_at DESC LIMIT 20;" 2>&1 || true
