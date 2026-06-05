# Bootstrap backend — intentionally LOCAL (filesystem).
# This module is the genesis config: it creates the S3 bucket that all other
# root modules use for remote state. A remote backend here would be circular
# (chicken-and-egg: init needs the bucket before the apply that creates it).
#
# Run-once instructions (per environment):
#   terraform -chdir=infra/terraform/aws/bootstrap init
#   [HITL] task tf:bootstrap:local   (LocalStack — Tier-2 validation)
#   [HITL] task tf:bootstrap:dev     (real AWS — Principle I gated)
#
# The resulting tfstate (local file) is ephemeral / machine-local.
# The S3 bucket it creates is the durable artifact that the other roots use.

terraform {
  backend "local" {
    path = "/tmp/dc-bootstrap.tfstate"
  }
}
