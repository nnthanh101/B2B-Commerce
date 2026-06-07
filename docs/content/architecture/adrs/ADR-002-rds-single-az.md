---
title: "ADR-002: RDS PostgreSQL Single-AZ for Phase 2"
description: Phase 2 deploys PostgreSQL on Amazon RDS Single-AZ db.t4g.micro — right-sized for low-TPS B2B quote workloads.
sidebar_position: 2
tags: [adr, aws, rds, postgresql, database, phase-2]
source_refs:
  - path: "docs/architecture/ADR-002-rds-single-az.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# ADR-002: RDS PostgreSQL Single-AZ for Phase 2 Deploy

**Status**: Accepted (Phase 2 boundary, v0.3 roadmap)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-b2b-commerce-p1-2026-06-04.json`

## Summary

Phase 2 (v0.3) deploys PostgreSQL on **Amazon RDS Single-AZ, `db.t4g.micro`** (or `db.t4g.small` if Phase 1 evidence shows headroom is tight). Single-AZ is the appropriate availability posture for the B2B quote/approval workload profile: low TPS, bursty during quote cycles, RPO ≤ 24h via automated snapshots. Multi-AZ and Aurora Serverless v2 are deferred to explicit upgrade triggers.

## Context

Dominant database workload:
- **Quote create / update / approve cycles** — bursty during business hours, idle overnight.
- **Company + employee CRUD** — low write rate, cached reads.
- **Cart validation hooks** — read-heavy spending-limit lookups.
- **Workflow step-state persistence** — Medusa writes step-state rows for every workflow run.

Phase 1 reality: `postgres:15-alpine` in the `ec_postgres_b2b` container.

Expected workload at Phase 2 for alpha customer OceanSoft:
- **TPS**: < 5 sustained, < 50 burst
- **Data volume**: < 5 GB year-1
- **Concurrent quote sessions**: < 10 admins, < 100 buyer-employees
- **RPO acceptable**: 24h
- **RTO acceptable**: 4h business-hours

## Decision

**Phase 2 (v0.3) provisions RDS PostgreSQL 15 Single-AZ**:

| Parameter | Value |
|-----------|-------|
| Engine | PostgreSQL 15 (matches Phase 1 container exactly) |
| Instance class | `db.t4g.micro` baseline; upgrade to `db.t4g.small` if needed |
| Storage | 20 GB `gp3` with autoscaling to 100 GB; encrypted at rest |
| Backup | Automated snapshots, 7-day retention; PITR enabled |
| Region | `$AWS_DEFAULT_REGION` (customer-configured, per ADR-001) |
| Availability | Single-AZ (explicitly NOT Multi-AZ in v0.3) |

**Aurora Serverless v2 migration triggers** (explicit):
- Data volume > 50 GB
- Sustained > 100 concurrent quote sessions
- Compliance requirement for synchronous Multi-AZ
- Customer-paid headroom available

## Consequences

**Accepted**: Single-AZ `db.t4g.micro` is ~$15-20/month on-demand. PostgreSQL 15 engine match eliminates version-drift bugs. t4g (Graviton ARM) is 20% cheaper than equivalent x86.

**Trade-offs**: AZ failure means downtime until snapshot restore completes (RTO ~ 1-4h). `db.t4g.micro` has burst-credit constraints.

**Rejected**: Multi-AZ at v0.3 (2x cost without workload justification), Aurora Serverless v2 at v0.3 (3-4x baseline cost), self-hosted Postgres on EC2 (operational overhead).

## Cross-References

- [ADR-001](./ADR-001-single-aws-account.md) — Single AWS Account
- `docker-compose.yml` lines 2-13 — Phase 1 `postgres:15-alpine` SSOT
