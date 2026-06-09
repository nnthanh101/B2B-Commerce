#!/usr/bin/env bash
# check-sso-callback-logs.sh — extract backend logs at the time of the SSO callback
set -euo pipefail
echo "=== Backend SSO callback logs ==="
docker logs ec_backend --tail 80 2>&1 | grep -iE "keycloak|auth|callback|unauthorized|error|vymalo|token|jwt|customer|email" | tail -40 || true
echo ""
echo "=== Full tail (last 30) ==="
docker logs ec_backend --tail 30 2>&1
