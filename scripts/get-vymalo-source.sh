#!/usr/bin/env bash
# Extract vymalo source from the backend container to understand validateCallback
docker cp ec_backend:/server/apps/backend/node_modules/@vymalo/medusa-keycloak /tmp/vymalo-src 2>/dev/null \
  || docker cp ec_backend:/root/.local/share/pnpm/store/v3/files /tmp/not-there 2>/dev/null \
  || echo "Could not find vymalo in expected paths"

ls /tmp/vymalo-src/ 2>/dev/null && echo "Found!" || echo "Not found"
