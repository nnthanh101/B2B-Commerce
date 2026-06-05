terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # null provider: required by tags validation and placeholder modules.
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}
