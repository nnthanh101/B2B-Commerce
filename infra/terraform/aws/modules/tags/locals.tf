# FOCUS 1.2+ tag composition — the single source of truth for all commerce tags.
# ADR-015 D1: 8 manual tags composed here; injected via provider.default_tags in each env root.
# Cross-cutting Service convention (ADR-015 §D1):
#   - TF-state bucket and cross-cutting resources: Service = backend (catch-all)
#   - SQS/SNS messaging:                          Service = async
#   - Media bucket:                                Service = storefront
#   These are expressed as per-resource `tags {}` overrides; this block sets the env default.
#
# Refs:
#   https://focus.finops.org/focus-specification/
#   https://aws.amazon.com/blogs/mt/tag-your-aws-resources-for-cost-allocation-with-aws-myapplications/
#   https://developer.hashicorp.com/terraform/language/values/locals

locals {
  common_tags = {
    # FOCUS ServiceName → AppRegistry rollup key.
    Application = "digital-commerce"

    # FOCUS group-by axis — enum: backend|storefront|data|edge|async.
    Service = var.service

    # Deployment environment.
    Environment = var.environment

    # Owning team for incident and cost escalation.
    Owner = var.owner

    # Finance chargeback (subsumes BillingTag per FOCUS BilledCost rollup).
    CostCenter = var.cost_center

    # IaC traceability.
    ManagedBy = "terraform"

    # CSDM sn_grc control scope.
    Compliance = var.compliance

    # CSDM Information Object / APRA data-asset classification.
    DataClassification = var.data_classification
  }
}
