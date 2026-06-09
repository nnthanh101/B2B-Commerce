#!/usr/bin/env bash
# wait-storefront-reload.sh — wait for storefront to show "ready" after a file change
set -euo pipefail
TIMEOUT=60
ELAPSED=0
echo "Waiting for storefront hot-reload (up to ${TIMEOUT}s)..."
while [ "${ELAPSED}" -lt "${TIMEOUT}" ]; do
  if docker logs ec_storefront --tail 20 2>&1 | grep -qiE "compiled|ready|reloaded"; then
    echo "Storefront reload detected at ${ELAPSED}s"
    docker logs ec_storefront --tail 10 2>&1
    exit 0
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done
echo "Timeout waiting for storefront reload — proceeding anyway"
docker logs ec_storefront --tail 15 2>&1
