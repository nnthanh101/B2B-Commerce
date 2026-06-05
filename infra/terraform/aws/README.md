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
├── bootstrap/         # Genesis config — LOCAL backend; creates the S3 state bucket (run-once)
├── modules/
│   ├── tags/          # FOCUS 1.2+ tag composition (locals + validation)
│   ├── foundation/    # Media S3, Secrets Manager x4, SQS, SNS (workload only — no tfstate bucket)
│   ├── observability/ # null_resource placeholder → AMP/AMG destination (v0.3)
│   ├── appregistry/   # count-guarded AppRegistry (AWS-only)
│   ├── network/       # VPC/subnets/SGs — LLD plan-only (v0.3)
│   ├── compute/       # ECS/ALB — LLD plan-only (v0.3)
│   └── data/          # RDS/ElastiCache — LLD plan-only (v0.3)
├── local/             # Tier-2 LocalStack root (S3 backend via LocalStack; appregistry disabled)
├── dev/               # real-AWS root (appregistry enabled; HITL-gated apply)
├── staging/           # LLD plan-only (v0.3)
└── prod/              # LLD plan-only (v0.3)
```

## Bootstrap Architecture (ADR-015 D3 amendment)

The S3 state bucket is provisioned by `bootstrap/` (local filesystem backend) BEFORE any
workload root module initialises. This breaks the self-referential deadlock that would occur
if foundation owned its own state bucket. See `bootstrap/README.md` for run-once instructions.

```
bootstrap/ (local backend)
  └── creates: digital-commerce-{env}-tfstate  ← S3 bucket
        ↑
        └── local/, dev/, staging/, prod/ store their state here (S3 backend)
```

## Local-First → Production Path

```
Tier-1  task tf:validate ENV=local          # $0 — HCL syntax + plan (no LocalStack needed)
         task tf:test                        # mock_provider tests (foundation, tags, appregistry)
Tier-2  task tf:local:up                    # start LocalStack
         task tf:bootstrap:local             # genesis: creates digital-commerce-sandbox-tfstate
         task tf:local:provision             # workload init -backend-config=backend-local.hcl + apply
         task tf:local:assert               # proves bootstrap bucket + state object + workload resources
Tier-3  task tf:validate ENV=dev            # plan review (HITL-gated apply)
         [HITL] terraform -chdir=aws/bootstrap apply -var="environment=dev"   # bootstrap dev bucket
         [HITL] terraform -chdir=aws/dev apply -backend-config=backend-dev.hcl
```

## Promotion Checklist (local → dev)

- [ ] `task tf:test` passes all module tests (foundation, tags, appregistry)
- [ ] `task tf:local:assert` passes all assertions including state-object-in-bucket proof
- [ ] `task tf:validate ENV=dev` exits 0
- [ ] HITL reviews `terraform plan` output
- [ ] AWS credentials configured (`aws sso login`)
- [ ] Dev tfstate bucket bootstrapped via `terraform -chdir=aws/bootstrap apply -var="environment=dev"`
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

| Resource | `Service` override | Owner module |
|---|---|---|
| TF-state S3 bucket | `backend` (cross-cutting catch-all) | `bootstrap/` |
| Media S3 bucket | `storefront` | `modules/foundation` |
| SQS / SNS event bus | `async` | `modules/foundation` |
| Secrets Manager | `backend` | `modules/foundation` |

## v0.2 Module Status Note

`modules/network`, `modules/compute`, and `modules/data` are **intentional v0.3 LLD stubs** — each contains a `null_resource` placeholder that signals the planned architecture shape. They are not dead code; they are deferred pending v0.3 VPC + ECS + RDS delivery. See the v0.3 Checklist above.

## References

- ADR-015: `docs/architecture/ADR-015-local-first-terraform-iac.md`
- ADR-007 (amended): `docs/architecture/ADR-007-grafana-prometheus-local-first.md`
- Commerce plugin SSOT: `adlc-framework/.claude/plugins/commerce/skills/focus-tag-schema/SKILL.md`
- AWS Prescriptive Guidance (LocalStack+Terraform): https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/test-aws-infra-localstack-terraform.html
