#!/bin/bash
set -e

echo "Starting observability stack..."
cd /Volumes/Working/projects/Digital-Commerce
docker compose -f docker-compose.observability.yml up -d

echo "Waiting for Grafana..."
for i in {1..60}; do
  if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q 'ok'; then
    echo "✓ Grafana healthy"
    break
  fi
  sleep 2
done

echo "Waiting for Prometheus..."
for i in {1..30}; do
  if curl -s -o /dev/null -w '%{http_code}' http://localhost:9090/-/ready 2>/dev/null | grep -q 200; then
    echo "✓ Prometheus ready"
    break
  fi
  sleep 2
done

echo "Verifying exporter targets..."
curl -s http://localhost:9090/api/v1/targets 2>/dev/null | jq '.data.activeTargets | map({job: .labels.job, health: .health})'

echo "Generating traffic for 120s..."
for i in {1..40}; do
  curl -s -o /dev/null http://localhost:9000/health 2>/dev/null || true
  curl -s -o /dev/null 'http://localhost:9000/store/products?limit=5' 2>/dev/null || true
  sleep 3
done

echo "Stack ready for screenshot capture"
