#!/usr/bin/env bash
# scripts/localstack-assert.sh
# Run resource checks against LocalStack (Tier-2 evidence).
# ADR-015 D3 amendment (2026-06-05): Assert 1 now proves bootstrap created the state bucket;
#   Assert 2 proves the workload state object physically landed in that bucket.
#   Combined: these prove the full genesis flow (bootstrap → S3 backend → workload apply).
# Writes evidence to tmp/Digital-Commerce/test-results/tier2-localstack-YYYY-MM-DD.txt
#
# Usage: bash scripts/localstack-assert.sh [ROOT_DIR]
# ROOT_DIR defaults to the repo root (two levels up from scripts/).

set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

ROOT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

PASS=0
FAIL=0
RESULTS=""

run_assert() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    PASS=$((PASS + 1))
    RESULTS="${RESULTS}PASS  ${label}\n"
  else
    FAIL=$((FAIL + 1))
    RESULTS="${RESULTS}FAIL  ${label}\n"
  fi
}

LS="docker exec -i dc-localstack awslocal"

# Assert 1: bootstrap created the tfstate bucket (genesis proof)
# Bucket name = digital-commerce-sandbox-tfstate (environment=sandbox per local/variables.tf)
run_assert "s3:bootstrap-created-tfstate-bucket" \
  "${LS} s3api head-bucket --bucket digital-commerce-sandbox-tfstate"

# Assert 2: workload state object exists in the bootstrap bucket (remote-state round-trip proof)
# Key = digital-commerce/local/terraform.tfstate (from backend-local.hcl)
run_assert "s3:workload-state-object-in-bucket" \
  "${LS} s3api head-object --bucket digital-commerce-sandbox-tfstate --key digital-commerce/local/terraform.tfstate"

# Assert 2: media bucket exists
run_assert "s3:media-bucket-exists" \
  "${LS} s3api head-bucket --bucket digital-commerce-local-media"

# Assert 3: media bucket has Application tag = digital-commerce
run_assert "s3:media-application-tag" \
  "${LS} s3api get-bucket-tagging --bucket digital-commerce-local-media \
    --query 'TagSet[?Key==\`Application\`].Value' --output text | grep -q 'digital-commerce'"

# Assert 4: secrets list contains DATABASE_URL
run_assert "secretsmanager:database-url-exists" \
  "${LS} secretsmanager list-secrets --query 'SecretList[].Name' --output text | grep -q 'DATABASE_URL'"

# Assert 5: secrets list has >= 4 secrets
run_assert "secretsmanager:all-4-secrets" \
  "${LS} secretsmanager list-secrets --query 'length(SecretList)' --output text | grep -qE '^[4-9]$|^[1-9][0-9]'"

# Assert 6: SQS queue exists
run_assert "sqs:events-queue-exists" \
  "${LS} sqs get-queue-url --queue-name digital-commerce-local-events"

# Assert 7: SNS topic exists
run_assert "sns:events-topic-exists" \
  "${LS} sns list-topics --query 'Topics[].TopicArn' --output text | grep -q 'digital-commerce-local-events'"

# Assert 8: AppRegistry NOT in terraform state (count=0 => enable_appregistry=false)
# Rule 8: grep -c || true (never grep -c || echo N in pipefail)
run_assert "appregistry:count-is-zero" \
  "docker run --rm --network digital-commerce_ls_net \
    -v '${ROOT_DIR}/infra/terraform/aws:/workspace' \
    -w /workspace/local \
    -e AWS_ACCESS_KEY_ID=test \
    -e AWS_SECRET_ACCESS_KEY=test \
    -e AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1} \
    nnthanh101/terraform:slim \
    sh -c 'terraform init -backend=false -no-color 2>/dev/null; count=\$(terraform state list 2>/dev/null | grep -c servicecatalogappregistry || true); count=\${count:-0}; test \$count -eq 0'"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo ""
log "=== localstack-assert results ${TIMESTAMP} ==="
printf "%b" "${RESULTS}"
echo "PASS: ${PASS} / FAIL: ${FAIL}"

# Write evidence file
EVIDENCE_DIR="${ROOT_DIR}/tmp/Digital-Commerce/test-results"
mkdir -p "${EVIDENCE_DIR}"
EVIDENCE_FILE="${EVIDENCE_DIR}/tier2-localstack-$(date +%Y-%m-%d).txt"
{
  echo "=== Tier-2 LocalStack assertions ${TIMESTAMP} ==="
  printf "%b" "${RESULTS}"
  echo "PASS: ${PASS} / FAIL: ${FAIL}"
} > "${EVIDENCE_FILE}"
log "Evidence written: ${EVIDENCE_FILE}"

if [ "${FAIL}" -gt 0 ]; then
  fail "${FAIL} assertion(s) failed — see ${EVIDENCE_FILE}"
fi
log "All ${PASS} assertions passed."
