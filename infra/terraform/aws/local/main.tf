# Local root module — Tier-2 LocalStack composition.
# ADR-015 D2: foundation + observability wired; appregistry disabled (Community edition).
# Modules wired: tags, foundation, observability, appregistry (count=0).
# Deferred (plan-only): network, compute, data — LLD skeletons at v0.3.

module "tags" {
  source = "../modules/tags"

  environment         = var.environment
  service             = "backend" # catch-all default; per-resource overrides in foundation
  owner               = var.owner
  cost_center         = var.cost_center
  compliance          = var.compliance
  data_classification = var.data_classification
}

# ADR-015 D5: AppRegistry disabled on LocalStack.
module "appregistry" {
  source = "../modules/appregistry"

  enable_appregistry = var.enable_appregistry
  application_name   = var.project
}

module "foundation" {
  source = "../modules/foundation"

  environment            = var.environment
  project                = var.project
  secret_recovery_window = 0 # instant delete; LocalStack has no persistent secret store

  depends_on = [module.tags]
}

# ADR-015 D6: observability placeholder; AMP/AMG provisioner at v0.3.
module "observability" {
  source = "../modules/observability"

  environment = var.environment
  project     = var.project
}
