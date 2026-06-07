# Dev root module providers — real AWS (no endpoint overrides).
# Auth via environment variables: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_PROFILE.
# Apply is HITL-gated (Principle I — no agent terraform apply to real AWS).

provider "aws" {
  region = var.aws_region

  # FOCUS 1.2+ tags from module.tags.
  # AppRegistry awsApplication tag is applied via a separate targeted apply in CI:
  #   terraform apply -target=module.appregistry
  # then a second apply merges the output. See ADR-015 D5 bootstrap note.
  default_tags {
    tags = module.tags.common_tags
  }
}

provider "null" {}
