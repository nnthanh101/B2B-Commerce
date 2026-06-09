#!/usr/bin/env bash
# Find vymalo package inside ec_backend container
docker cp ec_backend:/server/node_modules/@vymalo /tmp/vymalo-node-modules 2>/dev/null && echo "Found in /server/node_modules" || echo "Not in /server/node_modules"
docker cp ec_backend:/server/apps/backend/node_modules/@vymalo /tmp/vymalo-app-modules 2>/dev/null && echo "Found in apps/backend/node_modules" || echo "Not in apps/backend/node_modules"
