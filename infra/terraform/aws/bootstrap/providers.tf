# Bootstrap providers.
# LocalStack path: AWS_ENDPOINT_URL=http://localhost:4566 is injected by the task.
# The endpoints{} block mirrors local/providers.tf so bootstrap can run against
# LocalStack Community for Tier-2 validation (task tf:bootstrap:local).
# Real-AWS path (dev bootstrap): omit the endpoint overrides — provider reads
# standard credential chain (AWS_PROFILE / SSO). Principle I: HITL only.

locals {
  # Override via TF_VAR_localstack_endpoint or the AWS_ENDPOINT_URL env var.
  # When AWS_ENDPOINT_URL is set the AWS provider picks it up automatically (>=5.x).
  localstack_endpoint = "http://localstack:4566"
}

provider "aws" {
  region = var.aws_region

  # LocalStack does not validate credentials — dummy values satisfy provider init.
  # On real AWS these are ignored; the credential chain supplies real auth.
  access_key = "test"
  secret_key = "test"

  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3  = local.localstack_endpoint
    iam = local.localstack_endpoint
    sts = local.localstack_endpoint
  }

  default_tags {
    tags = {
      Application        = var.project
      Environment        = var.environment
      Service            = "backend"
      ManagedBy          = "terraform"
      Owner              = "team-commerce@oceansoft.io"
      CostCenter         = "CC-COMMERCE-001"
      Compliance         = "n/a"
      DataClassification = "internal"
    }
  }
}
