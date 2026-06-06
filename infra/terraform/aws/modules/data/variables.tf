variable "environment" {
  type        = string
  description = "Deployment environment."
}

variable "project" {
  type        = string
  description = "Project slug for resource naming."
  default     = "b2b-commerce"
}
