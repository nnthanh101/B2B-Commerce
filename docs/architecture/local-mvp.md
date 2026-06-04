# Local MVP — Phase 1 Topology Reference

> **Status**: Phase 1 — local-first 4-service docker-compose. NO AWS provisioning.
> **Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`
> **Companion**: [LOCAL.md](../LOCAL.md) (developer-facing runbook); this file is the architectural reference.

## Overview

Phase 1 of Digital-Commerce is the **local-first B2B skeleton** — every developer (HITL or AI-specialist) brings the full stack online via `docker-compose up` and `task up`, no AWS account required. The four containers, single bridge network, and named-volume topology are documented here as the architectural reference. Phase 2 (v0.3 roadmap per [b2b-blueprint.md](../b2b-blueprint.md) Deployment Evolution Timeline) lifts these four services onto a single AWS account with **no application-layer changes** — same container images for backend / storefront, same Postgres major version, same Redis major version.

Phase 1 also runs **Terraform in validate-only mode** via the container `nnthanh101/terraform:2.6.0`. No provider credentials are wired; `terraform plan` and `infracost breakdown` produce JSON output that proves the FOCUS 1.2+ tag set is wired even when costs are $0 (per DC-031 acceptance criterion in [discovery-brief.md](../discovery-brief.md)).

## Topology — 4 Services

Verified against the repository `docker-compose.yml` (lines 1–77):

```
┌──────────────────────────────────────────────────────────────┐
│  Network: ec_network_b2b (single bridge)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ec_postgres_b2b              ec_redis_b2b                  │
│   postgres:15-alpine           redis:7-alpine                │
│   :5432  (host:5432)           :6379  (host:6379)            │
│   volume: postgres_data_b2b    (ephemeral — no named volume) │
│                                                              │
│           ▲                          ▲                       │
│           │ DATABASE_URL             │ REDIS_URL             │
│           │                          │                       │
│   ec_backend_b2b ◀──── depends_on ───┘                       │
│   build: .  (Medusa 2.x)                                     │
│   :9000  (admin + API)                                       │
│   :5173  (Vite dev for admin SDK)                            │
│   env_file: apps/backend/.env                                │
│                                                              │
│           ▲                                                  │
│           │ NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://ec:9000    │
│                                                              │
│   ec_storefront_b2b                                          │
│   build: .  (Next.js 15.5+)                                  │
│   :8000  (storefront)                                        │
│   env_file: apps/storefront/.env                             │
│   entrypoint: ./scripts/start-storefront.sh                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

| Service | Container | Image | Ports (host:container) | Purpose |
|---------|-----------|-------|------------------------|---------|
| `postgres` | `ec_postgres_b2b` | `postgres:15-alpine` | `5432:5432` | Primary data store + FTS (per [ADR-005](./ADR-005-postgres-full-text-search.md)) |
| `redis` | `ec_redis_b2b` | `redis:7-alpine` | `6379:6379` | Session + cache + workflow lock backend |
| `ec` | `ec_backend_b2b` | `build: .` (Medusa 2.x backend) | `9000:9000`, `5173:5173` | API + admin UI + workflow engine |
| `storefront` | `ec_storefront_b2b` | `build: .` (Next.js storefront) | `8000:8000` | Buyer-employee + admin UI surface |

**Network**: `ec_network_b2b` (single Docker bridge — no service mesh, no overlay).

**Named volume**: `postgres_data_b2b` (Postgres data persistence across `docker-compose down`; intentionally NOT lost on restart, intentionally LOST on `down -v`).

**No volumes for Redis** — Redis is treated as ephemeral cache in Phase 1; session loss on restart is acceptable for solo-developer flow.

## What Phase 1 Does NOT Include

To prevent aspirational topology drift (anti-`PREMATURE_ABSTRACTION` per `.claude/memory/feedback_build_for_current_scale.md`), the following are explicitly **not in Phase 1**:

- **No Prometheus / Grafana containers** — instrumentation hooks land in v0.2; full stack lands at Phase 2 v0.3 per [ADR-007](./ADR-007-grafana-prometheus-local-first.md). Until then, the metrics endpoint at `http://localhost:9000/metrics` is unscraped.
- **No Quote Engine AI sidecar** — the 8 quote workflows under `apps/backend/src/workflows/quote/workflows/` (verified at `index.ts`: `create-quote`, `create-quote-message`, `create-request-for-quote`, `customer-accept-quote`, `customer-reject-quote`, `merchant-reject-quote`, `merchant-send-quote`, `update-quote`) run synchronously inside the `ec_backend_b2b` container. No AI inference. No external orchestrator.
- **No Stripe / payment provider** — mock provider in `medusa-config.ts`; sufficient for Playwright two-persona smoke test per [b2b-blueprint.md](../b2b-blueprint.md) DC-020. Real payments land at Phase 2 v0.4 per [ADR-011](./ADR-011-stripe-connect-marketplace.md).
- **No ADLC AI Gateway** — Roadmap v0.6 per [ADR-014](./ADR-014-adlc-subagent-governance.md). Zero AI code today.
- **No multi-region / replication / HA** — single Postgres container, single Redis container, single backend, single storefront. Multi-AZ is Phase 2 (v0.3+).

## Phase 2 v0.3 Mapping (Roadmap)

When Phase 2 v0.3 lifts this skeleton to AWS, the mapping is:

| Phase 1 service | Phase 2 surface | Reference |
|-----------------|-----------------|-----------|
| `ec_postgres_b2b` (postgres:15-alpine) | Amazon RDS PostgreSQL 15 Single-AZ `db.t4g.micro` | [ADR-002](./ADR-002-rds-single-az.md) |
| `ec_redis_b2b` (redis:7-alpine) | Amazon ElastiCache Redis 7 (cache.t4g.micro, single node) | TBD at v0.3 CA coordination |
| `ec_backend_b2b` (Medusa) | Amazon ECS Fargate (preferred) OR EKS (decision deferred to v0.3) | per [b2b-blueprint.md](../b2b-blueprint.md) Phase 2 target architecture |
| `ec_storefront_b2b` (Next.js) | Amazon CloudFront + Lambda@Edge OR ECS Fargate (TBD at v0.3) | per Phase 2 target architecture |
| `ec_network_b2b` (bridge) | VPC + private/public subnets across 1 AZ (v0.3); 2 AZs (v0.4+) | TBD at v0.3 |
| `postgres_data_b2b` (named volume) | RDS managed storage (gp3, 20 GB initial) | [ADR-002](./ADR-002-rds-single-az.md) |
| `.env` files (gitignored) | AWS Secrets Manager (per [ADR-003](./ADR-003-anthropic-direct-api.md) §"Phase 2 v0.3 secret source") | [ADR-003](./ADR-003-anthropic-direct-api.md) |

Region is **customer-configured** per deployment (`$AWS_DEFAULT_REGION` — no hardcoded default; multi-tenant operator model per [b2b-blueprint.md](../b2b-blueprint.md)).

## FOCUS 1.2+ Container Labels

Per [LOCAL.md](../LOCAL.md) FOCUS section, each Phase 1 service carries the equivalent of the 9-key FOCUS 1.2+ tag set as Docker labels (Phase 1 implementation pattern; Phase 2 converts these to AWS resource tags 1-for-1):

| Label key | Example value | Phase 2 AWS tag |
|-----------|---------------|------------------|
| `Service` | `digital-commerce-backend` | resource tag `Service` |
| `Environment` | `dev` | resource tag `Environment` |
| `Owner` | `oceansoft-platform` | resource tag `Owner` |
| `CostCenter` | `cc-engineering` | resource tag `CostCenter` |
| `Project` | `dc-p1-skeleton` | resource tag `Project` |
| `BillingTag` | `customer-oceansoft` | resource tag `BillingTag` |
| `ManagedBy` | `docker-compose` (Phase 1) → `terraform` (Phase 2) | resource tag `ManagedBy` |
| `Compliance` | `APRA-CPS234` | resource tag `Compliance` |
| `DataClassification` | `internal` (postgres), `internal` (redis), `internal` (backend), `customer` (storefront session data) | resource tag `DataClassification` |

Labels live in `docker-compose.yml` per-service `labels:` blocks (not shown above for topology readability — see file directly).

## Observability (Roadmap v0.3)

Per [ADR-007](./ADR-007-grafana-prometheus-local-first.md), the observability stack adds two sidecars at v0.3:

- `prom/prometheus:v2.55.0` (container `ec_prometheus_b2b`, port 9090)
- `grafana/grafana:11.3.0` (container `ec_grafana_b2b`, port 3000)

These images are semver-pinned (NOT `:latest`) and exempt from the `nnthanh101/*` registry rule (no enterprise equivalent for Prometheus/Grafana — same exemption as `infracost/infracost:ci-latest` in `.github/workflows/terraform-validate.yml`). Phase 1 does not include these containers; the metrics endpoint at `ec_backend_b2b:9000/metrics` exists but is unscraped until v0.2.

## ADLC AI Gateway (Roadmap v0.6 — Zero Code Today)

Per [ADR-014](./ADR-014-adlc-subagent-governance.md), the ADLC AI Gateway lands at v0.6 with **read-first, HITL-controlled write, evidence-first** governance. The integration surface — when it ships — is the 8 quote workflows above plus the 4 approval workflows (`apps/backend/src/workflows/approval/workflows/index.ts`: `update-approval-settings`, `create-approval-settings`, `create-approvals`, `update-approval`). Phase 1 has zero AI containers, zero AI dependencies, zero AI environment variables — the entire ADLC surface is documented intent, not code.

## Terraform Validate-Only (Phase 1)

Phase 1 runs Terraform exclusively in **validate-only mode** via the IaC container `nnthanh101/terraform:2.6.0`:

```
docker run --rm -v $(pwd)/infra/terraform:/workspace nnthanh101/terraform:2.6.0 \
  terraform -chdir=/workspace init -backend=false && \
  terraform -chdir=/workspace validate
```

`infracost breakdown --format json` runs in the same container and produces FOCUS-tagged output even with $0 cost (per DC-031). No AWS provider credentials are wired. The `terraform-validate.yml` GitHub Actions workflow runs the same commands in CI.

## Cross-References

- [LOCAL.md](../LOCAL.md) — developer runbook (`task up`, `task down`, smoke tests)
- [ADR-002: RDS PostgreSQL Single-AZ](./ADR-002-rds-single-az.md) — Phase 2 v0.3 data tier
- [ADR-005: PostgreSQL Full-Text Search](./ADR-005-postgres-full-text-search.md) — Phase 1 search posture (no Elasticsearch)
- [ADR-007: Grafana + Prometheus Observability](./ADR-007-grafana-prometheus-local-first.md) — Phase 1 + Phase 2 observability
- [ADR-010: Medusa OOTB-Extended](./ADR-010-medusa-ootb-extended.md) — backend extension boundary
- [ADR-012: Quote Engine Architecture](./ADR-012-quote-engine-architecture.md) — Quote Engine layers running inside `ec_backend_b2b`
- [ADR-014: ADLC Subagent Governance](./ADR-014-adlc-subagent-governance.md) — AI Gateway integration policy
- [discovery-brief.md — Phase 1 vertical-slice MVP](../discovery-brief.md)
- [b2b-blueprint.md — Phase 2 target architecture + Deployment Evolution Timeline](../b2b-blueprint.md)
