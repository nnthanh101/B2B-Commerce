#!/usr/bin/env bash
# debug-admin-login.sh — test admin login and show raw response
set -euo pipefail
echo "=== Admin login attempt ==="
curl -v -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"supersecret"}' 2>&1 | head -50
