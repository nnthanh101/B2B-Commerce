#!/usr/bin/env bash
# wait-backend-ready.sh — wait for backend to show "Server is ready on port: 9000"
set -euo pipefail
TIMEOUT=90
ELAPSED=0
echo "Waiting for backend ready (up to ${TIMEOUT}s)..."
while [ "${ELAPSED}" -lt "${TIMEOUT}" ]; do
  if docker logs ec_backend --tail 20 2>&1 | grep -q "Server is ready on port: 9000"; then
    echo "Backend ready at ${ELAPSED}s"
    docker logs ec_backend --tail 5 2>&1
    exit 0
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done
echo "Timeout — last 20 backend log lines:"
docker logs ec_backend --tail 20 2>&1
