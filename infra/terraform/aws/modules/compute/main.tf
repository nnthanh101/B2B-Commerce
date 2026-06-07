# compute module — LLD placeholder (deferred v0.3).
# v0.3: aws_ecs_cluster, aws_ecs_task_definition (backend + storefront),
#        aws_ecs_service, aws_lb, aws_lb_listener, aws_lb_target_group.

resource "null_resource" "compute_placeholder" {
  triggers = {
    environment = var.environment
    project     = var.project
  }
}
