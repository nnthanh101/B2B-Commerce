# Dev S3 backend — ADR-015 D3.
# use_lockfile = true: Terraform >=1.9 S3-native lock (no DynamoDB).
# Init: terraform init -backend-config=backend-dev.hcl
# Apply: HITL-gated only (Principle I).

terraform {
  backend "s3" {
    encrypt      = true
    use_lockfile = true
    # bucket / key / region supplied via -backend-config=backend-dev.hcl
  }
}
