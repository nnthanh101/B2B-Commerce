# ADR-005: PostgreSQL Full-Text Search (tsvector) for Phase 1-2

**Status**: Accepted (Phase 1 local, Phase 2 RDS)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`

## Summary

Digital-Commerce uses **PostgreSQL native full-text search** (`tsvector` + `tsquery`) for Phase 1 and Phase 2 product/quote/company search operations. FTS is built into the `postgres:15-alpine` container (Phase 1) and RDS PostgreSQL 15 (Phase 2); zero additional infrastructure cost at both scales. **Algolia migration trigger** is explicit: > 1M products OR > 100 concurrent search QPS OR quote-catalog hybrid search (semantic + structured filtering). **Quote-catalog hybrid search** (v0.4+ roadmap) will use pgvector for semantic similarity over quote descriptions, with FTS remaining the primary search index until Phase 2.

## Context

Digital-Commerce search surface includes:

- **Product catalog search** — buyer searches "LED lights 100W" across product titles + descriptions
- **Quote history search** — admin searches "Acme Corp" across company, quote, and line items
- **Company / employee search** — admin searches employee roster by name / email
- **Approval routing** — system routes approvals to the right approver based on company spending limits (lookup, not search)

Phase 1 reality: the local stack runs `postgres:15-alpine` in the `ec_postgres_b2b` container. RDS PostgreSQL 15 is the Phase 2 target (single-AZ, `db.t4g.micro`, per ADR-002). Both use the same major version (15) and both support `tsvector` natively.

Expected search volume at Phase 2:

- **Dataset**: < 10k products, < 5k quotes, < 500 companies (alpha customer + first 3 targets)
- **QPS**: < 10 search queries/second (bursty during demo time zones)
- **Latency SLA**: < 500ms p50 for product search, < 1s p99 for quote search

These envelopes make Postgres FTS appropriate. Algolia is a 3-4x cost increase for a problem Postgres solves natively; at < 10 QPS, FTS is abundant headroom.

The **quote-catalog hybrid search** pattern (structured filters + semantic similarity) is a Phase v0.4 capability — admin filters on "energy sector, approved status, > 50k AUD" then sees results ranked by semantic similarity to a written description. This requires pgvector extension + Claude embeddings API; FTS alone handles Phase 1-2 keyword search.

## Decision

**Use PostgreSQL full-text search for all Phase 1-2 search workloads.** Specifically:

- **FTS Implementation**:
  - Product search: tsvector index on `product.title || ' ' || product.description`, tsquery via Medusa admin/storefront API
  - Quote search: tsvector index on `quote.cart_snapshot` (JSON), quote message threads
  - Company search: tsvector index on `company.name || ' ' || contact_email`
  - Indices are built via Medusa migration scripts (see `apps/backend/src/migration-scripts/`) on first `pnpm migrate` run

- **Container FTS Setup** (Phase 1): postgres:15-alpine includes full-text search out-of-the-box (no extensions needed)

- **RDS FTS Setup** (Phase 2): AWS RDS PostgreSQL 15 includes native FTS; no RDS Extension subscription required

- **Query Pattern**: Medusa ORM (MikroORM) wraps Postgres FTS in typed queries:
  ```typescript
  const results = await repo.find({
    where: {
      search_vector: { $fullText: 'LED lights 100W' }
    }
  })
  ```

**Algolia Migration Trigger** (explicit, not vague):

- Product count > 1M (Phase 2 sign: marketplace scaling to multi-vendor)
- Sustained search QPS > 100 (Phase 2 sign: production traffic at scale)
- Quote-catalog semantic search required (Phase v0.4: customer asks "find quotes similar to this description")
- Algolia cost-benefit becomes positive (> $50/month spend justified by UX improvement)

**Quote-Catalog Hybrid Search Roadmap** (v0.4, zero code today):

- Phase 1: FTS only (exact keyword match on quote titles, company names, approval notes)
- Phase 2: FTS (still primary index) + filtered queries (company sector, approval status, date range)
- Phase v0.4: pgvector extension installed on RDS; Claude embeddings API integration; semantic ranking layer over FTS results
- Phase v0.5+: Algolia if semantic + structured search volume exceeds Postgres capacity

## Consequences

**Accepted**:

- **Zero infrastructure cost** at Phase 1-2 scales — Postgres FTS is included in the container and RDS tier.
- **Simplicity** — no dedicated search service, no embedding pipeline, no data-sync complexity between Postgres and Algolia.
- **Consistency** — all quote/company/product data in Postgres is immediately searchable; no ETL delays to sync Algolia.
- **Future flexibility** — pgvector extension (Phase v0.4) lands in the same RDS instance; no architectural refactoring to add semantic search.
- FTS indices live on the same RDS instance as the source data (per [ADR-002](./adr-002-rds-single-az.md)), so APRA CPS 234 §36 region-pinning + KMS encryption-at-rest covers the search surface for free — no separate compliance posture required for the search layer until Algolia migration at v0.5+ triggers a re-evaluation. `DataClassification=customer` propagates from the source tables to the FTS indices automatically.

**Trade-offs**:

- **Latency at scale** — FTS latency grows with dataset size and QPS. At 1M products, p99 latency may reach 2-3s; Algolia would serve <100ms at that scale. Acceptable until Phase v0.5 when scale justifies the cost.
- **Tuning complexity** — FTS index tuning (language settings, dictionary weights) requires SQL expertise. Algolia abstracts this. Mitigation: Phase v0.4 hires SRE support if semantic search becomes critical.
- **Relevance ranking** — FTS uses TF-IDF; user satisfaction at scale may require semantic embeddings (Phase v0.4). Keyword-match-only search is acceptable for Phase 1-2 alpha users.

**Rejected**:

- **Elasticsearch** — operational overhead (cluster setup, version management, backup discipline) destroys Phase 1 simplicity. Deferred to Phase v0.5+ when dedicated search infrastructure is justified.
- **OpenSearch** — same operational overhead as ES; no cost benefit for Phase 1-2.
- **Algolia from day 1** — premature optimization for 0 commercial customers and < 10k products. Cost overhead (~$50-200/month) unjustified at Phase 1-2 scale.

## Cost Analysis

| Scale | Postgres FTS | Algolia |
|-------|-------------|---------|
| < 10k products, < 10 QPS | Free (included) | $50/mo |
| 100k products, 50 QPS | Free (included) | $150/mo |
| 1M products, 100 QPS | Free (included) | $300-500/mo |
| 1M+ products, 1k QPS | ~$200/mo RDS tuning + headroom | $1000+/mo |

Migration trigger (explicit): when RDS read replica cost + tuning + latency pressure < Algolia cost + integration work.

## Cross-References

- [b2b-blueprint.md — B2B Features Matrix (search is not listed; future roadmap)](../b2b-blueprint.md)
- [LEAN-5S-3T.md — Build for current scale (FTS over Algolia for <10k products)](../LEAN-5S-3T.md)
- ADR-001: Single AWS Account (RDS provisions the Postgres instance)
- ADR-002: RDS Single-AZ (FTS indices live on this database)
- Phase 1 container: `docker-compose.yml` (postgres:15-alpine service)
- Medusa ORM: `apps/backend/src/modules/quote/index.ts` (where FTS queries are built)
