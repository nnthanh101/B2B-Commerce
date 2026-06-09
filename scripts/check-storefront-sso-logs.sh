#!/usr/bin/env bash
# check-storefront-sso-logs.sh — check storefront logs for SSO callback
set -euo pipefail
echo "=== Storefront SSO logs ==="
docker logs ec_storefront --tail 60 2>&1 | grep -iE "keycloak|callback|auth|401|403|error|cookie|jwt|customer|redirect" | tail -40 || true
echo ""
echo "=== Storefront tail (last 30) ==="
docker logs ec_storefront --tail 30 2>&1
