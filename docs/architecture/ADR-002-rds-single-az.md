# ADR-002: RDS PostgreSQL Single-AZ for Phase 2 Deploy

**Status**: Accepted (Phase 2 boundary, v0.3 roadmap)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-digital-commerce-p1-2026-06-04.json`

## Summary

Phase 2 (v0.3) deploys PostgreSQL on **Amazon RDS Single-AZ, `db.t4g.micro`** (or `db.t4g.small` if Phase 1 evidence shows headroom is tight). Single-AZ is the appropriate availability posture for the B2B quote/approval workload profile: low TPS, bursty during quote cycles, RPO ≤ 24h via automated snapshots. Multi-AZ and Aurora Serverless v2 are deferred to explicit upgrade triggers (data volume, concurrency, or compliance mandate). Phase 1 today runs `postgres:15-alpine` in the `ec_postgres_b2b` container — no RDS provisioned.

## Context

Digital-Commerce is a **quote-assisted B2B marketplace** — the dominant database workload is:

- **Quote create / update / approve cycles** — bursty during business hours, idle overnight. Each quote touches `quote`, `quote_line_items`, `approval`, and `approval_settings` tables.
- **Company + employee CRUD** — low write rate, cached read rate.
- **Cart validation hooks** — read-heavy spending-limit lookups (`validate-cart-completion.ts`, `validate-add-to-cart.ts`, `validate-update-cart.ts`).
- **Workflow step-state persistence** — Medusa writes step-state rows for every workflow run. Hot path; bounded by quote volume.

Phase 1 reality (verified in `docker-compose.yml`): the `postgres` service is `postgres:15-alpine` with container name `ec_postgres_b2b`, exposed on `5432`, persisted to the `postgres_data_b2b` named volume on the `ec_network_b2b` network. Backend connects via `DATABASE_URL=postgres://postgres:postgres@postgres:5432/ec-store`.

For alpha customer OceanSoft and the first three target customers, expected workload at Phase 2:

- **TPS**: < 5 sustained, < 50 burst
- **Data volume**: < 5 GB year-1 (quote + approval records + workflow state)
- **Concurrent quote sessions**: < 10 admins, < 100 buyer-employees
- **RPO acceptable**: 24h (B2B quote data is reconstructable from email + audit trail; not financial transaction data)
- **RTO acceptable**: 4h business-hours (single-AZ failure recovery via snapshot restore)

These envelopes justify Single-AZ. Multi-AZ doubles the cost (active standby in second AZ) for no workload benefit until concurrency or compliance forces it.

The `db.t4g.micro` baseline aligns with the AWS Well-Architected Sustainability pillar (Graviton ARM instances ~20% more energy-efficient per workload than equivalent x86) and the Cost Optimization pillar (cheapest defensible RDS posture for the actual workload profile). It also aligns with the "build for current scale, not aspirational" principle documented in [discovery-brief.md](../discovery-brief.md) — `db.r6g.large` for 5 TPS is the textbook `PREMATURE_ABSTRACTION` example.

## Decision

**Phase 2 (v0.3) provisions RDS PostgreSQL 15 Single-AZ** with these defaults:

- **Engine**: PostgreSQL 15 (matches Phase 1 `postgres:15-alpine` exactly — no version drift between local and cloud)
- **Instance class**: `db.t4g.micro` baseline; upgrade to `db.t4g.small` if Phase 1 evidence (memory pressure under Playwright golden-path load) shows headroom is tight
- **Storage**: 20 GB `gp3` with autoscaling to 100 GB; encrypted at rest with AWS-managed KMS key (customer-managed KMS deferred to v0.4)
- **Backup**: Automated snapshots, 7-day retention (RDS default); point-in-time recovery enabled
- **Region**: `$AWS_DEFAULT_REGION` (customer-configured per ADR-001)
- **Availability**: Single-AZ — explicitly NOT Multi-AZ in v0.3
- **FOCUS 1.2+ tags**: applied via Terraform `default_tags` (see ADR-001 for the 9-key set); `Service=digital-commerce-database`, `DataClassification=customer`, `Compliance=APRA-CPS234`

**Aurora Serverless v2 migration triggers** (explicit, not vague):

- Data volume > 50 GB
- Sustained > 100 concurrent quote sessions
- Compliance requirement for synchronous Multi-AZ (e.g. APRA-regulated customer mandate)
- Customer-paid headroom available — Aurora Serverless v2 baseline cost is ~3-4x t4g.micro

**Multi-AZ upgrade triggers** (without moving to Aurora):

- RTO requirement tightens to < 1h
- Customer SLA mandates 99.95% availability

These triggers are explicit so the v0.3 deploy does not bake them into the IaC ahead of need — `PREMATURE_ABSTRACTION` prevention.

## Consequences

**Accepted**:

- Single-AZ `db.t4g.micro` is the cheapest defensible RDS posture (~$15-20/month on-demand in most regions). Aligns with the Phase 1 `task up <600s` ethos: low cost, fast feedback.
- RPO 24h via snapshots is honest — buyer-side audit reports can defend "we can restore yesterday's state in 4 hours" but not "we have synchronous replication."
- PostgreSQL 15 engine match (Phase 1 container = Phase 2 RDS) eliminates version-drift bugs between local and cloud. Same SQL behaviour, same extension support, same upgrade timeline.
- t4g (Graviton ARM) instances are 20% cheaper than equivalent x86 — Well-Architected Sustainability pillar alignment without effort.

**Trade-offs**:

- AZ failure means downtime until snapshot restore completes (RTO ~ 1-4h depending on data volume). Customer messaging must be honest about this in v0.3 SLA.
- Single-AZ snapshot restore is region-local — disaster scenarios requiring cross-region recovery are deferred to v0.5.
- `db.t4g.micro` has burst-credit constraints; sustained CPU > baseline depletes credits and throttles. Mitigation: t4g.small upgrade trigger is documented; CloudWatch CPU alarm is part of the Terraform skeleton (v0.3).
- Connection pool sizing must respect the `db.t4g.micro` max_connections (default ~85). Backend deploys must use connection pooling (PgBouncer or Medusa's built-in) — not naive per-request connections.

**Rejected**:

- **Multi-AZ at v0.3** — 2x cost for availability the workload does not need. Reassess at customer SLA mandate.
- **Aurora Serverless v2 at v0.3** — 3-4x baseline cost; serverless scaling is the wrong tool for predictable low-TPS workloads. Premature optimization.
- **Self-hosted Postgres on EC2** — operational overhead (backups, patching, replication) destroys the v0.3 economics. Managed RDS is the right tier.
- **DynamoDB or DocumentDB** — Medusa requires relational PostgreSQL semantics (joins, transactions, MikroORM ORM layer). Non-relational stores are architecturally incompatible. Not seriously considered; documented here so the rejection is on the record.

## ANZ Regulatory Context

APRA CPS 234 §36 evidence requirements are discharged at the data-layer by:

- **Region pinning** via Terraform-pinned `$AWS_DEFAULT_REGION` (no cross-region replication in v0.3 by default; data residency is single-region per customer).
- **Encryption at rest** via AWS-managed KMS (CMK migration path documented for v0.4 when a regulated customer mandates customer-managed keys).
- **Automated snapshots** with 7-day retention satisfy Essential Eight E8 ("daily backups") baseline; v0.5 introduces cross-region warm standby for customers requiring it.
- **Audit trail** lives in the application layer (approval records in `apps/backend/src/modules/approval/` — see ADR-008), not the database engine. The database persists the evidence; the workflow generates it.

## Cross-References

- [b2b-blueprint.md — Phase 2 Single AWS account](../b2b-blueprint.md)
- [LEAN-5S-3T.md — RDS as managed-service Standardize pillar](../LEAN-5S-3T.md)
- ADR-001: Single AWS Account (RDS provisions into the same account)
- `docker-compose.yml` lines 2-13: Phase 1 `postgres:15-alpine` SSOT
- Phase 1 validation: `apps/backend/medusa-config.ts` `databaseUrl` configuration
