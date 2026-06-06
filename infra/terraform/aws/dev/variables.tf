# Dev root module variables.
# ADR-015: real-AWS root module; appregistry enabled; HITL-gated apply (Principle I).

variable "aws_region" {
  type        = string
  description = "AWS region (ap-southeast-2 for OceanSoft primary)."
  default     = "ap-southeast-2"
}

variable "environment" {
  type        = string
  description = "Deployment environment."
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod", "sandbox", "dr"], var.environment)
    error_message = "environment must be one of: dev, staging, prod, sandbox, dr."
  }
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
  validation {
    condition     = can(regex("^CC-[A-Z0-9][A-Z0-9_-]{2,14}$", var.cost_center))
    error_message = "cost_center must start with 'CC-' followed by 3-15 uppercase alphanumeric/dash/underscore characters (e.g. CC-COMMERCE-001)."
  }
}

variable "compliance" {
  type        = string
  description = "Compliance framework."
  default     = "n/a"
  validation {
    condition     = contains(["n/a", "soc2", "apra-cps234", "gdpr"], var.compliance)
    error_message = "compliance must be one of: n/a, soc2, apra-cps234, gdpr."
  }
}

variable "data_classification" {
  type        = string
  description = "Data sensitivity tier."
  default     = "internal"
  validation {
    condition     = contains(["internal", "customer", "pii"], var.data_classification)
    error_message = "data_classification must be one of: internal, customer, pii."
  }
}

# ADR-015 D5: AppRegistry enabled for real AWS.
variable "enable_appregistry" {
  type        = bool
  description = "Enable AWS AppRegistry. Must be false for LocalStack Community."
  default     = true
}
