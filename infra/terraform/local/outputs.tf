output "database_url" {
  description = "Connection string for the Medusa backend (.env DATABASE_URL)."
  value       = "postgres://${var.postgres_user}:${var.postgres_password}@localhost:${var.postgres_port}/${var.postgres_db}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection string."
  value       = "redis://localhost:${var.redis_port}"
}

output "network" {
  description = "Docker network name."
  value       = docker_network.this.name
}
