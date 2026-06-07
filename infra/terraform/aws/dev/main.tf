# Dev root module — real-AWS composition.
# ADR-015 D2: foundation + observability + appregistry enabled.
# Apply is HITL-gated (Principle I). Use terraform plan to review changes first.

module "tags" {
  source = "../modules/tags"

  environment         = var.environment
  service             = "backend"
  owner               = var.owner
  cost_center         = var.cost_center
  compliance          = var.compliance
  data_classification = var.data_classification
}

module "appregistry" {
  source = "../modules/appregistry"

  enable_appregistry = var.enable_appregistry
  application_name   = var.project
}

module "foundation" {
  source = "../modules/foundation"

  environment            = var.environment
  project                = var.project
  secret_recovery_window = 7 # 7-day recovery window; recoverable on accidental destroy

  depends_on = [module.tags]
}

module "observability" {
  source = "../modules/observability"

  environment = var.environment
  project     = var.project
}
