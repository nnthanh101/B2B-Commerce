# Local root module variables.
# ADR-015: Tier-2 LocalStack root module.

variable "aws_region" {
  type        = string
  description = "AWS region (LocalStack ignores this; kept for provider parity with dev/prod)."
  default     = "ap-southeast-2"
}

variable "environment" {
  type        = string
  description = "Deployment environment. LocalStack uses sandbox (SSOT-pure; no local enum in FOCUS plugin)."
  default     = "sandbox"
}

variable "project" {
  type        = string
  description = "Project slug for resource naming."
  default     = "b2b-commerce"
}

variable "owner" {
  type        = string
  description = "Owning team."
  default     = "team-commerce@oceansoft.io"
}

variable "cost_center" {
  type        = string
  description = "Finance cost center."
  default     = "CC-COMMERCE-001"
}

variable "compliance" {
  type        = string
  description = "Compliance framework."
  default     = "n/a"
}

variable "data_classification" {
  type        = string
  description = "Data sensitivity tier."
  default     = "internal"
}

# ADR-015 D5: AppRegistry disabled on LocalStack (servicecatalog-appregistry not in Community).
variable "enable_appregistry" {
  type        = bool
  description = "Enable AWS AppRegistry. Must be false for LocalStack Community."
  default     = false
}
