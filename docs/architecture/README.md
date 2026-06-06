# Architecture Decision Records (ADRs)

This directory contains accepted architectural decisions for the Digital-Commerce platform. Each ADR follows the **Summary → Context → Decision → Consequences** template.

## Naming convention

`adr-NNN-<kebab-slug>.md` — lowercase, dash-separated. Reflects the broader `docs/` kebab-lowercase enterprise convention. (Adoption date: 2026-06-04. Prior convention `ADR-NNN-*.md` was migrated to lowercase per [PO+CA consensus](../../tmp/Digital-Commerce/coordination-logs/product-owner-kebab-lowercase-round2-2026-06-04.json).)

## Index

| ADR | Title |
|---|---|
| [adr-001](./adr-001-single-aws-account.md) | Single AWS Account for Phase 2 |
| [adr-002](./adr-002-rds-single-az.md) | RDS Postgres Single-AZ (Phase 2) |
| [adr-003](./adr-003-anthropic-direct-api.md) | Anthropic Claude API Direct (no Bedrock) |
| [adr-004](./adr-004-next-js-server-action.md) | Next.js Server Actions for B2B UI Mutations |
| [adr-005](./adr-005-postgres-full-text-search.md) | Postgres FTS (Algolia at Roadmap v0.5+) |
| [adr-006](./adr-006-tag-only-github-actions.md) | Tag-Push GitHub Actions (HITL gate) |
| [adr-007](./adr-007-grafana-prometheus-local-first.md) | Grafana + Prometheus Local-First Observability **(amended 2026-06-05: hybrid-cloud SSOT, execute NOW)** |
| [adr-008](./adr-008-medusa-modules-reuse-vs-new.md) | Reuse B2B Commerce Modules |
| [adr-009](./adr-009-apps-as-first-party-not-upstream.md) | apps/ as First-Party OceanSoft IP |
| [adr-010](./adr-010-medusa-ootb-extended.md) | Medusa OOTB-Extended Pattern |
| [adr-011](./adr-011-stripe-connect-marketplace.md) | Stripe Connect Express Marketplace |
| [adr-012](./adr-012-quote-engine-architecture.md) | Quote Engine Architecture |
| [adr-013](./adr-013-anz-marketplace-supplier-vetting.md) | ANZ Marketplace Supplier Vetting (3-Layer) |
| [adr-014](./adr-014-adlc-subagent-governance.md) | ADLC Subagent Governance |
| [ADR-015](./ADR-015-local-first-terraform-iac.md) | Local-First Terraform IaC (LocalStack → AWS, Option A layout, FOCUS superset tags) |

## Cross-references

- [discovery-brief.md](../discovery-brief.md) — INVEST stories + LEAN Waste taxonomy
- [readiness-scorecard.md](../readiness-scorecard.md) — Phase 1 readiness + KPI gates
- [golden-path.md](../golden-path.md) — local Golden Path demo
- [b2b-blueprint.md](../b2b-blueprint.md) — positioning + unfair advantage stack
- [local-mvp.md](./local-mvp.md) — Phase 1 4-service topology
- [v0.3-deploy-release-reference.md](./v0.3-deploy-release-reference.md) — salvaged multi-stage backend Dockerfile + tag-only release pipeline (reinstate at v0.3)
