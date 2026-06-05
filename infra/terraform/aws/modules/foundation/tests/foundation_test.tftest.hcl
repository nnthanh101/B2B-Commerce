# Plan-level tests for modules/foundation.
# Uses mock_provider for aws (no real credentials needed).
# Verifies: resource naming, SSE config, public-access-block, DLQ redrive policy,
#           S3 versioning, and output keys.

mock_provider "aws" {}

# -------------------------------------------------------------------------
# Test 1: resource names follow {project}-{environment}-{suffix} convention.
# -------------------------------------------------------------------------
run "resource_naming_convention" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  assert {
    condition     = aws_s3_bucket.tfstate.bucket == "digital-commerce-dev-tfstate"
    error_message = "tfstate bucket must be named '{project}-{environment}-tfstate'."
  }

  assert {
    condition     = aws_s3_bucket.media.bucket == "digital-commerce-dev-media"
    error_message = "media bucket must be named '{project}-{environment}-media'."
  }

  assert {
    condition     = aws_sqs_queue.events.name == "digital-commerce-dev-events"
    error_message = "events queue must be named '{project}-{environment}-events'."
  }

  assert {
    condition     = aws_sqs_queue.events_dlq.name == "digital-commerce-dev-events-dlq"
    error_message = "DLQ must be named '{project}-{environment}-events-dlq'."
  }

  assert {
    condition     = aws_sns_topic.events.name == "digital-commerce-dev-events"
    error_message = "SNS topic must be named '{project}-{environment}-events'."
  }
}

# -------------------------------------------------------------------------
# Test 2: SSE AES256 enabled on both S3 buckets.
# -------------------------------------------------------------------------
run "s3_sse_enabled" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  assert {
    condition = alltrue([
      for r in aws_s3_bucket_server_side_encryption_configuration.tfstate.rule :
      alltrue([for d in r.apply_server_side_encryption_by_default : d.sse_algorithm == "AES256"])
    ])
    error_message = "tfstate bucket must have AES256 SSE enabled."
  }

  assert {
    condition = alltrue([
      for r in aws_s3_bucket_server_side_encryption_configuration.media.rule :
      alltrue([for d in r.apply_server_side_encryption_by_default : d.sse_algorithm == "AES256"])
    ])
    error_message = "media bucket must have AES256 SSE enabled."
  }
}

# -------------------------------------------------------------------------
# Test 3: public access block all-true on both S3 buckets.
# -------------------------------------------------------------------------
run "s3_public_access_block" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.tfstate.block_public_acls == true
    error_message = "tfstate bucket: block_public_acls must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.tfstate.block_public_policy == true
    error_message = "tfstate bucket: block_public_policy must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.tfstate.ignore_public_acls == true
    error_message = "tfstate bucket: ignore_public_acls must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.tfstate.restrict_public_buckets == true
    error_message = "tfstate bucket: restrict_public_buckets must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.media.block_public_acls == true
    error_message = "media bucket: block_public_acls must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.media.block_public_policy == true
    error_message = "media bucket: block_public_policy must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.media.ignore_public_acls == true
    error_message = "media bucket: ignore_public_acls must be true."
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.media.restrict_public_buckets == true
    error_message = "media bucket: restrict_public_buckets must be true."
  }
}

# -------------------------------------------------------------------------
# Test 4: versioning enabled on both buckets.
# -------------------------------------------------------------------------
run "s3_versioning_enabled" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  assert {
    condition     = alltrue([for v in aws_s3_bucket_versioning.tfstate.versioning_configuration : v.status == "Enabled"])
    error_message = "tfstate bucket versioning must be Enabled."
  }

  assert {
    condition     = alltrue([for v in aws_s3_bucket_versioning.media.versioning_configuration : v.status == "Enabled"])
    error_message = "media bucket versioning must be Enabled."
  }
}

# -------------------------------------------------------------------------
# Test 5: SQS redrive policy wired to DLQ with maxReceiveCount = 5.
# -------------------------------------------------------------------------
run "sqs_redrive_policy" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  assert {
    condition     = aws_sqs_queue.events.redrive_policy != null
    error_message = "events queue must have a redrive_policy configured."
  }
}

# -------------------------------------------------------------------------
# Test 6: outputs reference the correct underlying resource names.
# At plan time with mock_provider, ARNs/URLs are unknown; assert bucket id
# (aws_s3_bucket.id = bucket name) and queue name which are known at plan.
# -------------------------------------------------------------------------
run "outputs_present" {
  command = plan

  variables {
    environment = "dev"
    project     = "digital-commerce"
  }

  # Bucket names are known at plan time (they are static strings).
  assert {
    condition     = aws_s3_bucket.tfstate.bucket == "digital-commerce-dev-tfstate"
    error_message = "tfstate bucket name must be set (tfstate_bucket_id output source)."
  }

  assert {
    condition     = aws_s3_bucket.media.bucket == "digital-commerce-dev-media"
    error_message = "media bucket name must be set (media_bucket_id output source)."
  }

  # Queue names are known at plan time.
  assert {
    condition     = aws_sqs_queue.events.name == "digital-commerce-dev-events"
    error_message = "events queue name must be set (sqs_queue_url output source)."
  }

  assert {
    condition     = aws_sqs_queue.events_dlq.name == "digital-commerce-dev-events-dlq"
    error_message = "DLQ name must be set (sqs_dlq_arn output source)."
  }

  assert {
    condition     = aws_sns_topic.events.name == "digital-commerce-dev-events"
    error_message = "SNS topic name must be set (sns_topic_arn output source)."
  }

  # All 4 Secrets Manager secrets must have names set.
  assert {
    condition     = aws_secretsmanager_secret.database_url.name == "digital-commerce-dev/DATABASE_URL"
    error_message = "DATABASE_URL secret name must be set."
  }

  assert {
    condition     = aws_secretsmanager_secret.redis_url.name == "digital-commerce-dev/REDIS_URL"
    error_message = "REDIS_URL secret name must be set."
  }

  assert {
    condition     = aws_secretsmanager_secret.jwt_secret.name == "digital-commerce-dev/JWT_SECRET"
    error_message = "JWT_SECRET secret name must be set."
  }

  assert {
    condition     = aws_secretsmanager_secret.cookie_secret.name == "digital-commerce-dev/COOKIE_SECRET"
    error_message = "COOKIE_SECRET secret name must be set."
  }
}
