# Bootstrap module variables.
# These drive the bucket name: ${project}-${environment}-tfstate.

variable "environment" {
  type        = string
  description = "Deployment environment whose state bucket is being bootstrapped."
  default     = "sandbox"

  validation {
    condition     = contains(["sandbox", "dev", "staging", "prod", "dr"], var.environment)
    error_message = "environment must be one of: sandbox, dev, staging, prod, dr."
  }
}

variable "project" {
  type        = string
  description = "Project slug used in bucket naming."
  default     = "digital-commerce"
}

variable "aws_region" {
  type        = string
  description = "AWS region for the state bucket."
  default     = "ap-southeast-2"
}

variable "noncurrent_version_expiry_days" {
  type        = number
  description = "Days after which noncurrent state object versions are expired. 0 = disabled (default). Set to 90 for production environments. LocalStack Community does not support aws_s3_bucket_lifecycle_configuration — keep at 0 for Tier-2."
  default     = 0
}
