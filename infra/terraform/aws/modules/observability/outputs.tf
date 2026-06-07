# Stable output contract — v0.3 will add amp_workspace_arn, grafana_workspace_endpoint.

output "module_ready" {
  description = "Placeholder output confirming observability module skeleton is wired. Remove at v0.3."
  value       = "observability-placeholder-${var.environment}"
}
