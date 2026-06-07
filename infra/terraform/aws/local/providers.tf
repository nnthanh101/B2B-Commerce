# Local root module providers.
# ADR-015 D4: LocalStack endpoint injection via provider endpoints{} block.
# Ref: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/test-aws-infra-localstack-terraform.html
#
# R-B implementation: provider endpoints{} block + s3_use_path_style=true
# is the AWS prescriptive-guidance fallback when tflocal wrapper is not available.
# The LocalStack container is also configured to accept these endpoint overrides.
#
# AWS_ENDPOINT_URL env var is set to http://localstack:4566 in docker-compose.localstack.yml
# so the same providers.tf works in CI (env var override) and local dev.

locals {
  # LocalStack endpoint: override via AWS_ENDPOINT_URL env var in container runtime.
  # Default empty string means real AWS (dev/prod use). The env var is injected only
  # when running inside the docker-compose.localstack.yml network.
  localstack_endpoint = "http://localstack:4566"
}

provider "aws" {
  region = var.aws_region

  # LocalStack does not validate credentials — dummy values satisfy provider init.
  access_key = "test"
  secret_key = "test"

  # Path-style S3 required for LocalStack (virtual-hosted-style is default in AWS SDK v2).
  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3             = local.localstack_endpoint
    sqs            = local.localstack_endpoint
    sns            = local.localstack_endpoint
    secretsmanager = local.localstack_endpoint
    iam            = local.localstack_endpoint
    sts            = local.localstack_endpoint
    # servicecatalogappregistry deliberately omitted — appregistry disabled (count=0).
  }

  # FOCUS 1.2+ tags: composed in module.tags and injected here.
  # Note: AppRegistry is disabled on LocalStack (enable_appregistry=false, count=0).
  # The awsApplication tag is therefore not injected here — no cycle risk.
  # In dev/prod root modules, merge try(module.appregistry.application_tag, {}) after
  # the appregistry apply has already produced the output (two-phase apply pattern).
  default_tags {
    tags = module.tags.common_tags
  }
}

provider "null" {}
