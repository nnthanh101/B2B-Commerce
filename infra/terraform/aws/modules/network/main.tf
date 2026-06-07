# network module — LLD placeholder (deferred v0.3).
# v0.3: aws_vpc, aws_subnet (public + private + isolated tiers),
#        aws_internet_gateway, aws_nat_gateway, aws_route_table, aws_security_group.
# Three-tier layout: public (ALB only), private (ECS tasks), isolated (RDS, Redis).

resource "null_resource" "network_placeholder" {
  triggers = {
    environment = var.environment
    project     = var.project
  }
}
