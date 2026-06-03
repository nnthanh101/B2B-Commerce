# Local data-tier (Postgres + Redis) managed with the Docker provider — the IaC-first
# equivalent of docker-compose's stateful services. This proves the Terraform path
# end-to-end on a laptop before any AWS account exists (Phase 2 reuses the same
# variables + tagging discipline).
#
# Run the apps with `make up` (compose) pointed at these containers, OR extend this
# stack with backend/storefront containers. Do NOT run this alongside compose on the
# same host ports — pick one local orchestrator at a time.

resource "docker_network" "this" {
  name = "${var.project}-tf"
}

resource "docker_volume" "postgres_data" {
  name = "${var.project}-tf-pg-data"
}

resource "docker_image" "postgres" {
  name         = var.postgres_image
  keep_locally = true
}

resource "docker_image" "redis" {
  name         = var.redis_image
  keep_locally = true
}

resource "docker_container" "postgres" {
  name    = "${var.project}-tf-postgres"
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"

  env = [
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
  ]

  ports {
    internal = 5432
    external = var.postgres_port
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.this.name
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U ${var.postgres_user} -d ${var.postgres_db}"]
    interval = "5s"
    timeout  = "5s"
    retries  = 10
  }
}

resource "docker_container" "redis" {
  name    = "${var.project}-tf-redis"
  image   = docker_image.redis.image_id
  restart = "unless-stopped"

  ports {
    internal = 6379
    external = var.redis_port
  }

  networks_advanced {
    name = docker_network.this.name
  }
}
