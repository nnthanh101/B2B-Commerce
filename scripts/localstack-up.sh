#!/usr/bin/env bash
# scripts/localstack-up.sh
# Start LocalStack (Tier-2 harness) and wait until healthy.
# Requires AWS_DEFAULT_REGION env var to be set.
#
# Usage: bash scripts/localstack-up.sh

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

require_cmd docker "Install Docker Desktop"

: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION must be set}"

log "Creating LocalStack network (idempotent)..."
docker network create b2b-commerce_ls_net 2>/dev/null || true

log "Removing any previous LocalStack container..."
docker rm -f dc-localstack 2>/dev/null || true

log "Starting LocalStack Community (port 4566)..."
docker run -d --name dc-localstack \
  --network b2b-commerce_ls_net \
  --network-alias localstack \
  -e SERVICES=s3,sqs,sns,secretsmanager,iam,sts \
  -e DEFAULT_REGION="${AWS_DEFAULT_REGION}" \
  -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION}" \
  -e PERSISTENCE=0 \
  -e DISABLE_EVENTS=1 \
  -p 4566:4566 \
  localstack/localstack:3

# Wait up to 60 seconds for LocalStack to become healthy
http_wait "http://localhost:4566/_localstack/health" 12 5
