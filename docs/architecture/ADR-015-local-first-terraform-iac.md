# ADR-015: Local-First Terraform IaC Foundation (LocalStack → AWS, Option A Layout)

**Status**: Accepted (Phase 1 foundation slice; v0.3 real-AWS provisioning)
**Date**: 2026-06-05
**Deciders**: product-owner, cloud-architect, HITL
**Consensus**: PO+CA **93%** (Option A "superset on plugin base")
**Authority**:
- `tmp/B2B-Commerce/coordination-logs/product-owner-2026-06-05.json`
- `tmp/B2B-Commerce/coordination-logs/cloud-architect-2026-06-05.json`
**Related**: [ADR-006](./ADR-006-tag-only-github-actions.md) (S3-native lock / OIDC), [ADR-007](./ADR-007-grafana-prometheus-local-first.md) (observability SSOT), [ADR-001](./ADR-001-single-aws-account.md), [ADR-002](./ADR-002-rds-single-az.md)

## Summary

B2B-Commerce provisions AWS infrastructure with **Terraform, local-first via LocalStack Community**, structured so the *same* modules promote to real AWS by swapping provider endpoints + one feature flag — no rewrite. This ADR supersedes the untracked validate-only skeleton (`null_resource` placeholders, $0 infracost) and locks: (1) the **commerce-plugin FOCUS 1.2+ tag SSOT as a superset base** (8 manual + 1 auto-injected tag), (2) a **per-env-root-module layout** under `infra/terraform/aws/<env>/`, (3) a **foundation slice** of AWS resources that LocalStack Community can genuinely apply end-to-end, (4) an **S3-native state backend** (`use_lockfile`, no DynamoDB), and (5) **AppRegistry (AWS myApplications)** as a count-guarded, AWS-only module. Runtime separation: **docker-compose remains the local application runtime**; Terraform/LocalStack validates the AWS *provisioning* path only.

## Context

The repository carried an untracked Terraform skeleton at `infra/terraform/` (single root + `environments/{dev,staging,prod}/` compositions + `modules/{network,compute,data,observability}/`, all `null_resource`). It had two defects against the commerce plugin (the enterprise SSOT the platform standardizes on, `adlc-framework/.claude/plugins/commerce/skills/focus-tag-schema/SKILL.md`):

1. **Tag-schema conflict.** The skeleton set `Service = "b2b-commerce"` (the *business-app* name in the *component* slot) and carried `Project` + `BillingTag`. The plugin SSOT requires `Application = "b2b-commerce"` (business app → AppRegistry/FOCUS `ServiceName`) and `Service = enum[backend|storefront|data|edge|async]` (the FOCUS group-by axis). The skeleton's schema **breaks the `commerce_cost_by_service` FOCUS rollup contract**.
2. **Layout conflict.** The plugin hook (`focus-tag-precommit.sh`), `/commerce:tag-audit`, `/commerce:tf-plan`, and CI are all wired to `infra/terraform/aws/**`. The skeleton's `infra/terraform/environments/` paths engage none of that tooling.

The platform is **hybrid-cloud (AWS + Azure)** (root `CLAUDE.md`) and local-first / Docker-first by mandate. We need IaC that proves real provisioning locally at $0, carries FinOps cost attribution from day one, and is 100% ready to scale to PROD.

### Decision drivers (HITL criteria)
Enterprise-grade production-ready · FinOps FOCUS 1.2+ · AWS myApplications (AppRegistry) · CSDM/CMDB compatibility with ServiceNow/JIRA.

### Options considered
- **A — Superset on plugin base (CHOSEN):** plugin 6-tag SSOT + `infra/terraform/aws/<env>/` layout + AppRegistry, plus retained governance tags (`Compliance`, `DataClassification`) as a documented superset. Scored 20/20 against the 4 criteria.
- **B — Strict plugin SSOT:** exactly 6 tags; drops `Compliance`/`DataClassification`. Loses CSDM Information-Object + GRC control-scope fields (criterion d). 17/20.
- **C — Keep skeleton, adapt plugin:** keep 9-tag/`environments/` and edit the shared plugin tooling. Freezes the FOCUS-breaking `Service` conflation; touches a shared framework asset. 7/20.

## Decision

### D1 — FOCUS 1.2+ tag schema (superset). Net = 8 manual + 1 auto-injected.

| Tag | Value / Pattern | Origin | CSDM / FOCUS mapping |
|---|---|---|---|
| `Owner` | `team-commerce@oceansoft.io` | plugin SSOT | Support Group / `cmdb_ci.support_group` |
| `CostCenter` | `CC-COMMERCE-001` (`^CC-[0-9]{4,6}$`) | plugin SSOT | `cmdb_ci.cost_center`; FOCUS `BilledCost` rollup (subsumes BillingTag) |
| `Environment` | `dev\|staging\|prod\|sandbox\|dr` | plugin SSOT | Application Service env |
| `Application` | `b2b-commerce` | plugin SSOT | CSDM Business Application; FOCUS `ServiceName` |
| `Service` | `backend\|storefront\|data\|edge\|async` | plugin SSOT | Technical Service; FOCUS group-by axis |
| `ManagedBy` | `terraform` | plugin SSOT | `cmdb_ci.discovery_source` |
| `Compliance` | `n/a\|soc2\|apra-cps234\|gdpr` | skeleton (RETAINED) | `sn_grc` control scope |
| `DataClassification` | `internal\|customer\|pii` | skeleton (RETAINED) | CSDM Information Object / APRA §data-asset |
| `awsApplication` | auto-injected | AppRegistry | reconciliation correlation key |

- **DROP `Project`** — `Application` subsumes it for myApplications grouping.
- **DROP `BillingTag`** — `CostCenter` subsumes it for FOCUS `BilledCost` rollup; `BillingTag` is not in the FOCUS spec or the skill rollup contract.
- **Cross-cutting `Service` convention:** resources that aren't a single component (TF-state bucket, log target) take `Service = backend` via per-resource override; messaging (SQS/SNS) = `async`; media bucket = `storefront`. The enum is **not** expanded (stays plugin-aligned).
- All tags applied via `provider.default_tags` so every resource inherits them with no per-resource burden ([Terraform default_tags](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags-configuration-block)), composed in a shared `aws/modules/tags/` locals block ([Terraform locals](https://developer.hashicorp.com/terraform/language/values/locals)).
- **Deferred to v0.3:** `ServiceNowCI`/`correlation_id` write-back tag (no live ServiceNow instance yet).

### D2 — Directory layout (per-env root modules for blast-radius isolation)

```
infra/terraform/aws/
├── modules/
│   ├── tags/            # FOCUS superset tag composition (locals + enum validation)
│   ├── foundation/      # S3 state bucket, media S3, Secrets Manager, SQS, SNS
│   ├── observability/   # repurposed: AWS/Azure managed Grafana/Prometheus destinations (v0.3)
│   ├── appregistry/     # count-guarded AppRegistry application (AWS-only)
│   ├── network/         # VPC/subnets/SGs  — LLD / plan-only (deferred v0.3)
│   ├── compute/         # ECS/ALB          — LLD / plan-only (deferred v0.3)
│   └── data/            # RDS/ElastiCache  — LLD / plan-only (deferred v0.3)
├── local/   # Tier-2 LocalStack root module: foundation; appregistry disabled
├── dev/     # real-AWS root module: appregistry enabled; deferred apply (HITL-gated)
├── staging/ # LLD / plan-only (deferred)
└── prod/    # LLD / plan-only (deferred)
```

Shared modules live at `aws/modules/`; each `<env>/main.tf` calls `module "x" { source = "../modules/x" }`. Per-env root modules give independent state and independent blast radius (a `dev` apply cannot touch `prod`). The `aws/` segment reserves the `infra/terraform/<cloud>/` namespace for the hybrid-cloud (Azure) posture.

### D3 — State backend (S3-native lock, no DynamoDB)

```hcl
terraform {
  backend "s3" {
    encrypt      = true
    use_lockfile = true   # Terraform >=1.9 S3-native lock (writes .tflock beside state)
    # bucket / key / region supplied via -backend-config=backend-<env>.hcl
  }
}
```

DynamoDB locking is **dropped** — the [Terraform 1.10 S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3) positions `use_lockfile` as the preferred mechanism (consistent with [ADR-006](./ADR-006-tag-only-github-actions.md)). Per-env state isolation via `backend-<env>.hcl`. Bootstrap: the state bucket is created first with a local backend, then state is migrated (trivial on ephemeral LocalStack). Tier-2 exercises the **real S3 backend on LocalStack via `tflocal`**, proving the production state path — not a `local` backend that validates nothing.

### D4 — Foundation slice (real on LocalStack Community)

LocalStack Community fully emulates S3, SQS, SNS, Secrets Manager, IAM, STS. The foundation slice = `aws_s3_bucket` (tfstate + media), `aws_secretsmanager_secret` (DATABASE_URL, REDIS_URL, JWT_SECRET, COOKIE_SECRET), `aws_sqs_queue` + `aws_sns_topic` (+ subscription) for the Medusa event bus. **VPC/ECS/RDS/ElastiCache/ALB/CloudFront are LLD plan-only (Tier-1)** — LocalStack Community cannot meaningfully emulate them; they apply on real AWS at v0.3. This follows the [AWS Prescriptive Guidance: Test AWS infrastructure with LocalStack + Terraform](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/test-aws-infra-localstack-terraform.html) pattern (`tflocal` injects endpoints + path-style S3).

### D5 — AppRegistry (AWS myApplications), AWS-only

`servicecatalog-appregistry` is **not** in LocalStack Community. Guard with a feature flag + count:

```hcl
resource "aws_servicecatalogappregistry_application" "this" {
  count = var.enable_appregistry ? 1 : 0
  name  = "b2b-commerce"
}
# provider default_tags:
tags = merge(local.common_tags, try(module.appregistry.application_tag, {}))
```

`local/` sets `enable_appregistry = false` (count=0 → no API call → LocalStack apply succeeds); `dev/` sets `true`. Reference: [AWS myApplications tagging](https://aws.amazon.com/blogs/mt/tag-your-aws-resources-for-cost-allocation-with-aws-myapplications/).

### D6 — Observability reconciliation (hybrid-cloud, no CloudWatch)

Per [ADR-007](./ADR-007-grafana-prometheus-local-first.md) (hybrid-cloud amendment), the observability SSOT is **vendor-neutral Grafana/Prometheus**, not CloudWatch. Therefore the foundation slice **drops the CloudWatch log group**; the `observability` TF module is **repurposed** as the cloud-destination provisioner for AWS Managed Prometheus/Grafana (and an Azure Managed Grafana sibling) at v0.3. Logs (Loki) deferred. Metrics run local-first in docker-compose now.

## Consequences

**Accepted**
- FOCUS rollup contract restored (`Application` + `Service` distinct) → per-service + per-tenant cost attribution from day one.
- `task tf:local:up && tf:local:apply` provisions a **real** foundation slice into LocalStack at $0; `tf:local:assert` proves it (8 `awslocal` assertions); promotion to AWS = endpoint + flag swap.
- Plugin tooling (hook, `/commerce:tag-audit`, `/commerce:tf-plan`, CI) now engages (`infra/terraform/aws/**`).
- One fewer service (no DynamoDB); multi-cloud namespace reserved.

**Trade-offs / required follow-through**
- **Taskfile `tf:*` + `/commerce:tf-plan` discovery path MUST move to `infra/terraform/aws/<env>/`** (the tasks currently mount `infra/terraform`). Tracked as a must-fix.
- 2-step state-bucket bootstrap needed.
- VPC/compute/data remain plan-only until v0.3 (real-AWS apply is HITL-gated, Principle I).

**Rejected**
- DynamoDB state lock (superseded by S3-native `use_lockfile`).
- Strict 6-tag SSOT (loses CSDM/APRA governance fields).
- LocalStack Pro (RDS/ECS/AppRegistry emulation) — not justified at current scale.

## Verification

```bash
task tf:validate ENV=local                       # Tier 1: exit 0
docker compose -f docker-compose.localstack.yml up -d
task tf:local:apply                              # Tier 2: tflocal apply, exit 0
task tf:local:assert                             # 8 awslocal assertions PASS
task tf:cost                                     # Infracost FOCUS report
/commerce:tag-audit infra/terraform/aws/local/   # exit 0 (6 mandatory tags)
```

## Cross-References
- [ADR-006](./ADR-006-tag-only-github-actions.md) — S3-native lock + OIDC GitHub Actions
- [ADR-007](./ADR-007-grafana-prometheus-local-first.md) — Grafana/Prometheus observability SSOT (hybrid-cloud)
- [ADR-001](./ADR-001-single-aws-account.md) · [ADR-002](./ADR-002-rds-single-az.md) — AWS account + RDS posture (v0.3 compute/data fill-in)
- Commerce plugin SSOT — `adlc-framework/.claude/plugins/commerce/skills/focus-tag-schema/SKILL.md`
- [Terraform locals](https://developer.hashicorp.com/terraform/language/values/locals) · [block ref](https://developer.hashicorp.com/terraform/language/block/locals) · [Spacelift guide](https://spacelift.io/blog/terraform-locals)
- [FOCUS 1.2 spec](https://focus.finops.org/focus-specification/)
