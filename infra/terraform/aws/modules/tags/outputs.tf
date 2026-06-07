# Expose tag map for provider default_tags injection and CI tag-presence assertions.

output "common_tags" {
  description = "FOCUS 1.2+ compliant tag map (8 manual tags). Inject via provider.default_tags."
  value       = local.common_tags
}

# Validation smoke-check: all 8 required tag keys must be non-empty at plan time.
# Runs as a lifecycle precondition on a null_resource so validation fires before resources.
resource "null_resource" "tag_validation" {
  triggers = {
    tag_hash = sha256(jsonencode(local.common_tags))
  }

  lifecycle {
    precondition {
      condition = alltrue([
        length(local.common_tags["Application"]) > 0,
        length(local.common_tags["Service"]) > 0,
        length(local.common_tags["Environment"]) > 0,
        length(local.common_tags["Owner"]) > 0,
        length(local.common_tags["CostCenter"]) > 0,
        length(local.common_tags["ManagedBy"]) > 0,
        length(local.common_tags["Compliance"]) > 0,
        length(local.common_tags["DataClassification"]) > 0,
      ])
      error_message = "All 8 FOCUS 1.2+ required tags must be non-empty. Check module.tags variables."
    }
  }
}
