# data module — LLD placeholder (deferred v0.3).
# v0.3: aws_db_instance (RDS PostgreSQL), aws_elasticache_replication_group (Redis),
#        aws_db_subnet_group, aws_elasticache_subnet_group.

resource "null_resource" "data_placeholder" {
  triggers = {
    environment = var.environment
    project     = var.project
  }
}
