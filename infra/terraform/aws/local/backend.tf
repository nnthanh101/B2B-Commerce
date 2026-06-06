# Local root module backend — S3 remote state via LocalStack (Tier-2).
# ADR-015 D3 amendment (2026-06-05): backend switched from local-file to S3.
# The S3 bucket is created by infra/terraform/aws/bootstrap/ BEFORE this init runs.
#
# Sequence (task tf:local:provision handles this automatically):
#   1. task tf:bootstrap:local          → bootstrap creates b2b-commerce-sandbox-tfstate
#   2. terraform init -backend-config=backend-local.hcl -reconfigure
#   3. terraform apply -auto-approve    → state lands in that bucket (proven by head-object)
#
# bucket / key / region / encrypt / use_lockfile supplied via -backend-config=backend-local.hcl
# AWS_ENDPOINT_URL=http://localstack:4566 is injected by the Docker network (task environment).

terraform {
  backend "s3" {
    encrypt      = true
    use_lockfile = true
    # bucket / key / region supplied via -backend-config=backend-local.hcl
  }
}
