#!/usr/bin/env bash
# check-admin-hash.sh — check admin password hash and auth info
set -euo pipefail
echo "=== Admin provider identity ==="
docker exec ec_postgres psql -U postgres -d ec-store -t -c "SELECT pi.entity_id, LEFT(pi.provider_metadata::text, 100) FROM provider_identity pi WHERE pi.entity_id = 'admin@test.local';" 2>&1 || true
echo ""
echo "=== app_metadata for admin auth identity ==="
docker exec ec_postgres psql -U postgres -d ec-store -t -c "SELECT ai.app_metadata FROM provider_identity pi JOIN auth_identity ai ON pi.auth_identity_id = ai.id WHERE pi.entity_id = 'admin@test.local';" 2>&1 || true
