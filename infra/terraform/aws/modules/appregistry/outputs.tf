# application_tag: merged into provider default_tags via try(module.appregistry.application_tag, {}).
# Returns {} when enable_appregistry = false (LocalStack / bootstrap) — safe to merge.

output "application_tag" {
  description = "AppRegistry awsApplication tag map. Empty when enable_appregistry=false."
  value       = var.enable_appregistry ? { awsApplication = aws_servicecatalogappregistry_application.this[0].application_tag } : {}
}
