# Observability module — null_resource placeholder.
#
# ADR-015 D6 / ADR-007 amendment (2026-06-05):
#   CloudWatch rejected as observability SSOT (AWS-only; blind to Azure).
#   Grafana/Prometheus = vendor-neutral SSOT, runs local-first in docker-compose TODAY.
#   This Terraform module is the DESTINATION provisioner at v0.3:
#     - aws_amp_workspace (AWS Managed Prometheus)
#     - aws_grafana_workspace (Amazon Managed Grafana)
#     - Azure Managed Grafana sibling (via azurerm provider at v0.3)
#
# v0.3 resources (deferred):
#   - aws_prometheus_workspace.this
#   - aws_grafana_workspace.this
#   - aws_grafana_workspace_saml_configuration.this
#   - Loki (logs) + Tempo (traces) destinations
#
# NOT added (dropped per ADR-015 D6):
#   - aws_cloudwatch_log_group (CloudWatch rejected as SSOT)
#   - aws_cloudwatch_metric_alarm
#   - aws_cloudwatch_dashboard

resource "null_resource" "observability_placeholder" {
  triggers = {
    environment = var.environment
    project     = var.project
  }
}
