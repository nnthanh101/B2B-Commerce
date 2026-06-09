#!/usr/bin/env bash
# find-vymalo-path.sh — locate the installed vymalo medusa-keycloak service.js
set -euo pipefail
docker exec ec_backend find /server -name "service.js" -path "*medusa-keycloak*" 2>/dev/null | head -5
