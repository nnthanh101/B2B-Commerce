#!/usr/bin/env bash
# Test Keycloak connectivity from within ec_network.
# Used to diagnose whether the Playwright container can reach keycloak:8080.
set -euo pipefail

echo "=== Testing Keycloak connectivity from ec_network ==="
echo ""

# Try reaching keycloak via its Docker Compose service name on ec_network
HTTP_CODE=$(docker run --rm \
  --network ec_network \
  alpine/curl:latest \
  sh -c "curl -s -o /dev/null -w '%{http_code}' http://keycloak:8080/realms/medusa-commerce/.well-known/openid-configuration")

echo "keycloak:8080 → HTTP ${HTTP_CODE}"

# Try the management/health port
HEALTH_CODE=$(docker run --rm \
  --network ec_network \
  alpine/curl:latest \
  sh -c "curl -s -o /dev/null -w '%{http_code}' http://keycloak:9000/health/ready")

echo "keycloak:9000/health → HTTP ${HEALTH_CODE}"

echo ""
echo "If keycloak:8080 returns 200 — Playwright container will be able to reach Keycloak."
echo "If it returns 000 or ERR — Keycloak is not reachable inside ec_network on port 8080."
