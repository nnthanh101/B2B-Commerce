---
title: "ADR-001: Single AWS Account for Phase 2"
description: B2B-Commerce deploys to a single AWS account per customer tenancy at Phase 2 (v0.3).
sidebar_position: 1
tags: [adr, aws, deployment, phase-2, terraform]
source_refs:
  - path: "docs/architecture/ADR-001-single-aws-account.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# ADR-001: Single AWS Account for Phase 2 Deploy

**Status**: Accepted (Phase 2 boundary, v0.3 roadmap)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-b2b-commerce-p1-2026-06-04.json`

## Summary

B2B-Commerce will deploy onto a **single AWS account per customer tenancy** at Phase 2 (v0.3 roadmap milestone). Phase 1 today is validate-only — no AWS resources are provisioned; `terraform init -backend=false && terraform validate` and `infracost breakdown` are the gates. Multi-account Landing Zone (LZ) topology is deferred to v0.5+ when multi-tenant operator mode lands. Azure Australia East remains a roadmap option (multi-cloud unfair advantage), not a forced scope expansion today.

## Context

B2B-Commerce is a **quote-assisted B2B-Commerce for ANZ regulated industries** (Energy, FSI, Telecom). The deployment surface must serve:

- One alpha customer (OceanSoft) in v0.3
- Customer-controlled data residency (APRA CPS 234 §36, Essential Eight)
- FinOps FOCUS 1.2+ tag-driven cost attribution from line 1
- A monorepo with 2 apps today (`apps/backend`, `apps/storefront`) — no aspirational scale

Phase 1 reality (verified against [b2b-blueprint.md](../../b2b-blueprint.md) and [golden-path.md](../../process-qa/golden-path.md)): the entire stack runs in `docker-compose.yml` with 4 services. No AWS account is touched. The Terraform skeleton at `infra/terraform/` is exercised via the `nnthanh101/terraform:2.6.0` container with `validate` + `infracost` only.

The multi-account LZ debate is **premature** at v0.3. We have 0 paying customers and 1 alpha tenant. Building for 10+ accounts today would violate `PREMATURE_ABSTRACTION`.

## Decision

**Phase 2 (v0.3) deploys to a single AWS account.** Specifically:

- **One account per customer** — OceanSoft alpha lands in its own AWS account; future paying customers each get one.
- **Region**: customer-configured per deployment via `$AWS_DEFAULT_REGION` (never hardcoded).
- **No Landing Zone Accelerator, no Organizations, no Control Tower** at v0.3.
- **AWS myApplications + AppRegistry** is the application-discovery surface at Phase 2 deploy.
- **FOCUS 1.2+ tags** are the mandatory tag set in `infra/terraform/tags.tf` as `default_tags` on the AWS provider.

**Phase 1 → Phase 2 transition** (no application-layer change):

| Concern | Phase 1 (local-first, today) | Phase 2 (single AWS account, v0.3) |
|---------|------------------------------|------------------------------------|
| Compute | `ec_backend_b2b` + `ec_storefront_b2b` containers | ECS Fargate OR EKS (deferred to v0.3 CA coordination) |
| Database | `ec_postgres_b2b` (`postgres:15-alpine`) | RDS PostgreSQL 15 (see ADR-002) |
| Cache | `ec_redis_b2b` (`redis:7-alpine`) | ElastiCache Redis 7 |
| IaC | `terraform validate` only | `terraform apply` with per-customer profile |
| Region | N/A (local) | `$AWS_DEFAULT_REGION` (customer-configured) |

**Azure Australia East** stays on the multi-cloud roadmap (v0.5+). Single Terraform skeleton, two-cloud capability.

## Consequences

**Accepted**: Single account simplifies IAM, network, and Terraform state in v0.3. Customer-paid AWS billing is straightforward. Data residency posture is defensible.

**Trade-offs**: No Organizations-scoped SCPs in v0.3. Per-customer Terraform state means migrations to multi-tenant (v1.0) require state import work.

**Rejected**: Landing Zone Accelerator at v0.3 (over-engineered), AWS Organizations parent now (overhead without forcing function), hardcoded region (blocked by hooks), shared multi-tenant AWS account in v0.3 (compromises data sovereignty).

## Cross-References

- [b2b-blueprint.md](../../b2b-blueprint.md) — Phase 2 single AWS account
- [ADR-002](./ADR-002-rds-single-az.md) — RDS Single-AZ
- [ADR-015](./ADR-015-local-first-terraform-iac.md) — Local-First Terraform IaC
