# Foundation module variables.
# ADR-015 D4: S3 state bucket, media S3, Secrets Manager, SQS, SNS.

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod, sandbox, dr). LocalStack root passes sandbox."
}

variable "project" {
  type        = string
  description = "Project slug used in resource naming."
  default     = "b2b-commerce"
}

variable "secret_recovery_window" {
  type        = number
  description = "Recovery window in days for Secrets Manager secrets on destroy. 0 = instant delete (local/dev). Set >=7 for prod-path environments."
  default     = 0
}

