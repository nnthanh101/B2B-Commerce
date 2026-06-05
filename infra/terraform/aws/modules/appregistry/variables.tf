# AppRegistry module variables.
# ADR-015 D5: count-guarded; servicecatalog-appregistry NOT in LocalStack Community.

variable "enable_appregistry" {
  type        = bool
  description = "Enable AWS AppRegistry application resource. Set false for LocalStack (Community edition does not emulate servicecatalog-appregistry)."
  default     = false
}

variable "application_name" {
  type        = string
  description = "AWS AppRegistry application name."
  default     = "digital-commerce"
}
