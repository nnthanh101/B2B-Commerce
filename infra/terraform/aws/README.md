# infra/terraform/aws — Local-First Terraform IaC

**ADR-015** · Status: Active (foundation slice v0.1)

## Tag Schema (ADR-015 D1 — 8 manual + 1 auto-injected)

| Tag | Value / Pattern | FOCUS / CSDM mapping |
|---|---|---|
| `Application` | `digital-commerce` | FOCUS `ServiceName`; AppRegistry rollup key |
| `Service` | `backend\|storefront\|data\|edge\|async` | FOCUS group-by axis; component enum |
| `Environment` | `dev\|staging\|prod\|sandbox\|dr\|local` | Application Service env |
| `Owner` | `team-commerce@oceansoft.io` | FOCUS Owner; `cmdb_ci.support_group` |
| `CostCenter` | `CC-COMMERCE-001` (`^CC-[0-9]{4,6}$`) | FOCUS `BilledCost` rollup; `cmdb_ci.cost_center` |
| `ManagedBy` | `terraform` | `cmdb_ci.discovery_source` |
| `Compliance` | `n/a\|soc2\|apra-cps234\|gdpr` | `sn_grc` control scope |
| `DataClassification` | `internal\|customer\|pii` | CSDM Information Object; APRA data-asset |
| `awsApplication` | auto-injected | AppRegistry reconciliation key |

DROP `Project` (Application subsumes) · DROP `BillingTag` (CostCenter subsumes per FOCUS spec).

## Directory Layout

```
aws/
├── modules/
│   ├── tags/          # FOCUS 1.2+ tag composition (locals + validation)
│   ├── foundation/    # S3 state + media, Secrets Manager, SQS, SNS
│   ├── observability/ # null_resource placeholder → AMP/AMG destination (v0.3)
│   ├── appregistry/   # count-guarded AppRegistry (AWS-only)
│   ├── network/       # VPC/subnets/SGs — LLD plan-only (v0.3)
│   ├── compute/       # ECS/ALB — LLD plan-only (v0.3)
│   └── data/          # RDS/ElastiCache — LLD plan-only (v0.3)
├── local/             # Tier-2 LocalStack root (appregistry disabled)
├── dev/               # real-AWS root (appregistry enabled; HITL-gated apply)
├── staging/           # LLD plan-only (v0.3)
└── prod/              # LLD plan-only (v0.3)
```

## Local-First → Production Path

```
Tier-1  task tf:validate ENV=local          # $0 — HCL syntax + plan
Tier-2  task tf:local:up
        task tf:local:provision             # LocalStack apply, exit 0
        task tf:local:assert                # 8 awslocal assertions PASS
Tier-3  task tf:validate ENV=dev            # plan review (HITL-gated apply)
        [HITL] terraform -chdir=aws/dev apply -backend-config=backend-dev.hcl
```

## Promotion Checklist (local → dev)

- [ ] `task tf:local:assert` passes 8/8 assertions (evidence in `tmp/Digital-Commerce/test-results/tier2-localstack-*.txt`)
- [ ] `task tf:validate ENV=dev` exits 0
- [ ] HITL reviews `terraform plan` output
- [ ] AWS credentials configured (`aws sso login`)
- [ ] tfstate S3 bucket bootstrapped (`dev` environment, S3-native lock `use_lockfile=true`)
- [ ] `enable_appregistry=true` confirmed in `aws/dev/variables.tf`

## v0.3 Checklist

- [ ] VPC + subnets + SGs (network module)
- [ ] ECS Fargate cluster + ALB (compute module)
- [ ] RDS PostgreSQL + ElastiCache Redis (data module)
- [ ] AMP workspace + AMG workspace (observability module, replace null_resource)
- [ ] Azure Managed Grafana sibling (azurerm provider)
- [ ] ServiceNow CSDM write-back tag (`ServiceNowCI`)
- [ ] CloudFront distribution (edge module)

## Cross-Service Tag Convention

| Resource | `Service` override |
|---|---|
| TF-state S3 bucket | `backend` (cross-cutting catch-all) |
| Media S3 bucket | `storefront` |
| SQS / SNS event bus | `async` |
| Secrets Manager | `backend` |

## References

- ADR-015: `docs/architecture/ADR-015-local-first-terraform-iac.md`
- ADR-007 (amended): `docs/architecture/ADR-007-grafana-prometheus-local-first.md`
- Commerce plugin SSOT: `adlc-framework/.claude/plugins/commerce/skills/focus-tag-schema/SKILL.md`
- AWS Prescriptive Guidance (LocalStack+Terraform): https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/test-aws-infra-localstack-terraform.html
