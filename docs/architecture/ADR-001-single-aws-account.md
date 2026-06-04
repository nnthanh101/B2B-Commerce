# ADR-001: Single AWS Account for Phase 2 Deploy

**Status**: Accepted (Phase 2 boundary, v0.3 roadmap)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-digital-commerce-p1-2026-06-04.json`

## Summary

Digital-Commerce will deploy onto a **single AWS account per customer tenancy** at Phase 2 (v0.3 roadmap milestone). Phase 1 today is validate-only — no AWS resources are provisioned; `terraform init -backend=false && terraform validate` and `infracost breakdown` are the gates. Multi-account Landing Zone (LZ) topology is deferred to v0.5+ when multi-tenant operator mode lands. Azure Australia East remains a roadmap option (multi-cloud unfair advantage), not a forced scope expansion today.

## Context

Digital-Commerce is a **quote-assisted B2B marketplace for ANZ regulated industries** (Energy, FSI, Telecom). The deployment surface must serve:

- One alpha customer (OceanSoft) in v0.3
- Customer-controlled data residency (APRA CPS 234 §36, Essential Eight)
- FinOps FOCUS 1.2+ tag-driven cost attribution from line 1
- A monorepo with 2 apps today (`apps/backend`, `apps/storefront`) — no aspirational scale

Phase 1 reality (verified against [b2b-blueprint.md](../b2b-blueprint.md) and [golden-path.md](../golden-path.md)): the entire stack runs in `docker-compose.yml` with 4 services (`ec_postgres_b2b`, `ec_redis_b2b`, `ec_backend_b2b`, `ec_storefront_b2b`). No AWS account is touched. The Terraform skeleton at `infra/terraform/` is exercised via the `nnthanh101/terraform:2.6.0` container with `validate` + `infracost` only.

The multi-account LZ debate (one account per environment vs. one account per customer vs. AWS Organizations + Control Tower) is **premature** at v0.3. We have 0 paying customers and 1 alpha tenant. Building for 10+ accounts today would violate `PREMATURE_ABSTRACTION` and the project memory rule "Build for current scale, not aspirational" (`.claude/memory/feedback_build_for_current_scale.md`).

The unfair-advantage stack ([b2b-blueprint.md](../b2b-blueprint.md)) includes **AWS + Azure + Terraform-native** as item 2 — but multi-cloud is a v0.5+ commitment, not a v0.3 obligation. Phase 2 must not bake AWS-only assumptions into the Terraform skeleton, but it also must not provision Azure at v0.3 for no customer reason. The single-cloud Phase 2 keeps the deploy surface small while the modules and tag schema remain cloud-portable.

## Decision

**Phase 2 (v0.3) deploys to a single AWS account.** Specifically:

- **One account per customer** — OceanSoft alpha lands in its own AWS account; future paying customers each get one. Aligns with ANZ data-sovereignty expectations (no shared tenancy by default).
- **Region**: customer-configured per deployment via `$AWS_DEFAULT_REGION` (Sydney is a common ANZ selection but never hardcoded). Single region per customer for APRA CPS 234 §36 data-residency alignment.
- **No Landing Zone Accelerator, no Organizations, no Control Tower** at v0.3. Reassess when customer #3 onboards or when an enterprise customer mandates AWS Organizations parent.
- **AWS myApplications + AppRegistry** is the application-discovery surface at Phase 2 deploy — every resource registered to a single `digital-commerce` application with FOCUS 1.2+ tags propagated automatically. (Carry-forward from CA round-1 LOW-4.)
- **FOCUS 1.2+ tags** are the mandatory tag set in `infra/terraform/tags.tf` as `default_tags` on the AWS provider:
  - `Service` — e.g. `digital-commerce-backend`
  - `Environment` — `dev` / `staging` / `prod`
  - `Owner` — e.g. `oceansoft-platform`
  - `CostCenter` — e.g. `cc-engineering`
  - `Project` — e.g. `dc-p1-skeleton`
  - `BillingTag` — e.g. `customer-oceansoft` (multi-tenant rebilling key from v1.0)
  - `ManagedBy` — `terraform`
  - `Compliance` — `APRA-CPS234` (or `N/A` for non-regulated workloads)
  - `DataClassification` — `internal` / `customer` / `pii`

Tag enforcement runs in CI via `infracost breakdown --format json` + tag-presence checks. Missing tags fail the merge gate.

**Phase 1 → Phase 2 transition** (no application-layer change):

| Concern | Phase 1 (local-first, today) | Phase 2 (single AWS account, v0.3) |
|---------|------------------------------|------------------------------------|
| Compute | `ec_backend_b2b` + `ec_storefront_b2b` containers via `docker-compose.yml` | ECS Fargate OR EKS (deferred to v0.3 CA coordination) |
| Database | `ec_postgres_b2b` (`postgres:15-alpine`) | RDS PostgreSQL 15 (see ADR-002) |
| Cache | `ec_redis_b2b` (`redis:7-alpine`) | ElastiCache Redis 7 |
| IaC | `terraform validate` only (no provider creds) | `terraform apply` with per-customer profile from `~/.aws/config` |
| Tags | Documented in [golden-path.md](../golden-path.md) container-tag section | Enforced via Terraform `default_tags` |
| Region | N/A (local) | `$AWS_DEFAULT_REGION` (customer-configured) |
| Discovery | docker-compose service names | AWS myApplications + AppRegistry |

**Azure Australia East** stays on the multi-cloud roadmap (v0.5+) as part of the unfair advantage stack documented in [b2b-blueprint.md](../b2b-blueprint.md). Single Terraform skeleton, two-cloud capability. Not a forced scope today.

## Consequences

**Accepted**:

- Single AWS account simplifies IAM, network, and Terraform state in v0.3. One `terraform/environments/customer-oceansoft/` directory; one S3 backend; one DynamoDB lock table.
- Customer-paid AWS billing is straightforward — each customer account is its own billing boundary; no chargeback machinery required until multi-tenant operator (v1.0).
- Data residency posture is defensible: customer chooses the region, we honour it via `$AWS_DEFAULT_REGION`. APRA CPS 234 §36 evidence is the Terraform-pinned region attribute.
- AppRegistry-tagged resources surface in AWS myApplications dashboard for the customer — discoverability without bespoke tooling.

**Trade-offs**:

- No Organizations-scoped SCPs in v0.3 — customer account is governed by IAM + tag-enforcement only. Acceptable risk for alpha (OceanSoft); reassess for regulated customers requiring central guardrails.
- Per-customer Terraform state means migrations to multi-tenant operator (v1.0) require state import work. Mitigation: Terraform modules are environment-agnostic (the `tags.tf` and provider block are the only customer-specific surface).
- Cross-account observability (centralised logs across customers) is deferred to v0.4 OpenTelemetry MELT — not free in single-account world.
- Per-workload AWS profile management at v0.3 deploy uses individual `~/.aws/config` entries — not `$AWS_MANAGEMENT_PROFILE` (which is Organizations-only per `.adlc/.claude/rules/engineering/aws-profile-semantics.md`). Mitigation: Phase 2 README documents the per-customer profile setup; CI uses OIDC role-assumption (no long-lived keys).

**Rejected**:

- **Landing Zone Accelerator at v0.3** — over-engineered for 1 alpha customer. Reassess at customer #3 or when an enterprise customer mandates it.
- **AWS Organizations parent now** — adds management-account overhead without a forcing function. The right time is when we have a portfolio of customer accounts to govern.
- **Hardcoded region** — explicitly rejected. `$AWS_DEFAULT_REGION` is the only acceptable surface; the `HARDCODED_ENV_IN_PRODUCT_DOCS` hook blocks any commit that bakes a region literal into product docs.
- **Shared multi-tenant AWS account in v0.3** — would compromise data-sovereignty posture (no per-customer region selection, blast-radius shared). Deferred to v1.0 multi-tenant operator model where the operator (not the customer) carries the shared-account tradeoff explicitly.

## ANZ Regulatory Context

APRA CPS 234 §36 requires regulated FSI customers to demonstrate (a) data-residency controls, (b) human accountability for material decisions, and (c) auditable retention. A single AWS account per customer with a Terraform-pinned `$AWS_DEFAULT_REGION` discharges (a) directly; the Quote → Approval workflow (see ADR-008) discharges (b); RDS automated snapshots and CloudTrail logging discharge (c). The Essential Eight strategy E5 ("application allowlisting") is roadmap (v0.5+); E8 ("daily backups") is satisfied by RDS automated snapshots at v0.3.

## Cross-References

- [b2b-blueprint.md — Phase 2 single AWS account](../b2b-blueprint.md)
- [discovery-brief.md — Build for current scale discipline and ANZ buyer persona context](../discovery-brief.md)
- [golden-path.md — Demo the running system](../golden-path.md)
- ADR-009: Apps as First-Party Code (same monorepo deploys to this account)
- Memory: `.claude/memory/feedback_build_for_current_scale.md`
- Profile semantics: `.adlc/.claude/rules/engineering/aws-profile-semantics.md`
