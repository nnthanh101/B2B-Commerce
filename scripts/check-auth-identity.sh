#!/usr/bin/env bash
# check-auth-identity.sh — check auth_identity table structure and SSO entries
set -euo pipefail
echo "=== auth_identity table columns ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "\d auth_identity" 2>&1 || true
echo ""
echo "=== auth_identity rows ==="
docker exec ec_postgres psql -U postgres -d ec-store -c "SELECT * FROM auth_identity LIMIT 10;" 2>&1 || true
