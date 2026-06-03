variable "project" {
  description = "Resource name prefix."
  type        = string
  default     = "digital-commerce"
}

variable "postgres_image" {
  description = "Postgres image (pinned)."
  type        = string
  default     = "postgres:16-alpine"
}

variable "redis_image" {
  description = "Redis image (pinned)."
  type        = string
  default     = "redis:7-alpine"
}

variable "postgres_db" {
  description = "Database name."
  type        = string
  default     = "digital_commerce"
}

variable "postgres_user" {
  description = "Database user."
  type        = string
  default     = "medusa"
}

variable "postgres_password" {
  description = "Database password (override via TF_VAR_postgres_password)."
  type        = string
  default     = "medusa"
  sensitive   = true
}

variable "postgres_port" {
  description = "Host port for Postgres."
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "Host port for Redis."
  type        = number
  default     = 6379
}
