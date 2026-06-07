# Bootstrap — S3 Terraform state bucket (genesis resource).
# ADR-015 D3 amendment: bootstrap is the ONLY module allowed a local backend.
# All other root modules (local, dev, staging, prod) point their S3 backend at
# the bucket this module creates. Destroy is HITL-gated and irreversible (all
# remote state would be lost). See backend.tf run-once instructions.

locals {
  bucket_name = "${var.project}-${var.environment}-tfstate"
}

# ---------------------------------------------------------------------------
# S3: Terraform state bucket
# Service tag = backend (cross-cutting per ADR-015 §D1)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "tfstate" {
  bucket = local.bucket_name

  # Prevent accidental destroy. HITL must set allow_destroy=true and re-apply
  # before a destroy can proceed.
  lifecycle {
    prevent_destroy = false # Set true in prod-path environments after first apply.
  }

  tags = {
    Service = "backend"
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# Lifecycle: expire noncurrent state object versions (optional; default 90d).
# Reduces storage cost on long-lived buckets. Set var to 0 to disable.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  count  = var.noncurrent_version_expiry_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.tfstate.id

  rule {
    id     = "expire-noncurrent-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiry_days
    }
  }
}
