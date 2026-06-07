# Observability module variables.
# ADR-015 D6 + ADR-007 amendment: CloudWatch dropped as SSOT.
# This module is repurposed as the AMP/AMG (AWS Managed Prometheus/Grafana) +
# Azure Managed Grafana destination provisioner at v0.3.
# Current state: null_resource placeholder preserving the stable variable contract.

variable "environment" {
  type        = string
  description = "Deployment environment."
}

variable "project" {
  type        = string
  description = "Project slug for resource naming."
  default     = "b2b-commerce"
}

# v0.3 variables (reserved — uncomment when AMP/AMG resources are added):
# variable "amp_workspace_alias" { type = string; default = "" }
# variable "grafana_auth_providers" { type = list(string); default = ["AWS_SSO"] }
