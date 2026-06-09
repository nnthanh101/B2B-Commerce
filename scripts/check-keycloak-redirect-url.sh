#!/usr/bin/env bash
# check-keycloak-redirect-url.sh — verify backend uses new callback URL
# Makes a POST to /auth/customer/vymalo-keycloak and shows the redirect_uri
set -euo pipefail
RESULT=$(curl -sf -X POST http://localhost:9000/auth/customer/vymalo-keycloak \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 || echo "CURL_ERROR")
echo "Auth initiation response: ${RESULT}"
echo ""
echo "redirect_uri in location URL:"
echo "${RESULT}" | grep -o "redirect_uri=[^&]*" | head -1 | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null || echo "${RESULT}" | grep -o "redirect_uri=[^&]*" | head -1
