# ADR-007: Grafana + Prometheus Observability Stack (Local-First)

**Status**: Accepted (Phase 1 local docker-compose, Phase 2 roadmap)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`

## Summary

Digital-Commerce uses **Prometheus + Grafana** for observability, deployed as containers in local `docker-compose.yml` (Phase 1) with a Phase 2 upgrade path to **managed Grafana Cloud OR self-hosted on ECS** (decision deferred to v0.3 CA coordination). Phase 1 metrics focus on **Medusa workflow lifecycle** (quote created → sent → approved/rejected timing), **approval-flow SLA tracking**, **cart-abandonment signals**, and **FinOps cost-per-quote attribution**. ADLC subagent supervision metrics (Claude API calls, cost per call, success rate) are a **Phase v0.3 roadmap capability** (zero code today). Phase 1 is observability foundation; instrumentation depth scales with production traffic.

## Context

Digital-Commerce operates in two personas' workflows:

- **Buyer-employee**: browse → add to cart → request quote → wait for approval → place order
- **Admin / sales-manager**: review pending quotes → approve/reject → generate PO

Both journeys generate structured events:

| Event | Metric name | Consumer | Phase 1 target |
|-------|------------|----------|----------------|
| Quote created | `quote_created_total` | FinOps (cost-per-quote), Product (usage signals) | Prometheus scrape from backend |
| Quote sent to buyer | `quote_sent_total` | SLA tracking, sales velocity | Medusa workflow step event |
| Quote approved | `quote_approved_total` | Approval SLA, admin productivity | Workflow step event |
| Quote rejected | `quote_rejected_total` | Lost-deal tracking | Workflow step event |
| Approval timeout | `approval_timeout_total` | SLA breach alert | Workflow timeout handler |
| Cart abandoned | `cart_abandoned_total` | Product analytics | Cart session timeout |
| FinOps cost-per-quote | `quote_cost_usd_total` | Finance / multi-tenant invoice | FOCUS tag aggregation |

Phase 1 reality: the `docker-compose.yml` does not yet include grafana/prometheus services, but the wiring is trivial (add two containers, expose port 3000 for Grafana, port 9090 for Prometheus). Medusa backend exports metrics via a `/metrics` HTTP endpoint using Prometheus client library.

Phase 2 decision (v0.3 roadmap): either provision Grafana Cloud (SaaS, ~$50-200/mo depending on data volume) OR self-host Grafana on ECS (requires additional container). This decision depends on whether Phase 2 production traffic justifies the cost.

## Decision

**Deploy Prometheus + Grafana locally in Phase 1; upgrade path to managed/self-hosted in Phase 2.** Specifically:

**FOCUS 1.2+ tagging**: observability infrastructure carries the full 9-key tag set at Phase 2 (`Service=digital-commerce-observability`, `Environment={dev,staging,prod}`, `Owner=cloudops`, `CostCenter=engineering`, `Project=digital-commerce`, `BillingTag={customer-X}`, `ManagedBy=adlc`, `Compliance=APRA-CPS234` audit surface, `DataClassification=internal`). Phase 1 docker-compose containers carry equivalent container labels per [golden-path.md](../golden-path.md) FOCUS section. Cost attribution for observability is non-optional for multi-tenant FinOps rebilling.

- **Prometheus** (Phase 1 container):
  - Image: `prom/prometheus:v2.55.0`
  - Container name: `ec_prometheus_b2b`
  - Port: `9090`
  - Scrape targets: `ec_backend_b2b:8000/metrics` (Medusa admin metrics), `ec_redis_b2b:6379` (Redis exporter)
  - Retention: 15 days (Phase 1 local; disk-bounded)
  - Config: `prometheus.yml` at repo root

- **Grafana** (Phase 1 container):
  - Image: `grafana/grafana:11.3.0`
  - Container name: `ec_grafana_b2b`
  - Port: `3000`
  - Data source: Prometheus (`http://ec_prometheus_b2b:9090`)
  - Dashboards: 3 Phase-1 dashboards
    - Quote Workflow SLA (quote created → approved; target: median < 2h, p99 < 8h)
    - Approval Queue (pending quotes by company, approver load)
    - Cart Abandonment (sessions started, carts abandoned, conversion rate)
  - Persistence: named volume `grafana_data_b2b`

- **Medusa metrics endpoint** (backend instrumentation):
  - Endpoint: `GET http://localhost:9000/metrics` (exposed via Medusa prometheus middleware)
  - Metrics format: Prometheus text format (OpenMetrics compatible)
  - Key metrics:
    ```
    quote_created_total{company_id="...",environment="dev"} 42
    quote_sent_total{...} 38
    quote_approved_total{...} 35
    quote_approval_duration_seconds_bucket{...} 3600
    cart_abandoned_total{...} 5
    ```

- **Phase 2 upgrade options** (decision deferred to v0.3 CA coordination):
  - **Option A: Grafana Cloud** — managed SaaS (~$50-200/mo), handles scaling automatically, includes alerting
  - **Option B: Self-hosted Grafana on ECS** — Terraform module provisions Grafana container, same local UI, RDS for persistent storage, ~$100/mo infrastructure cost
  - **Option C: AWS CloudWatch** — rejected for Phase 1-2 (requires AWS account; Phase 1 is local-only)

## Consequences

**Accepted**:

- **Zero cloud cost at Phase 1** — Prometheus + Grafana are open-source containers; no SaaS subscription until Phase 2.
- **Observability from day 1** — quote SLA metrics are visible during demo; helps validate "quote cycles are faster with Digital-Commerce."
- **Phase 2 flexibility** — same Prometheus scrape targets work with Grafana Cloud or self-hosted (no app-layer refactoring needed).
- **Audit trail** — Medusa workflow step events populate metrics; matches APRA CPS 234 §36 evidence trail (every quote state change is tracked).

**Trade-offs**:

- **Local data loss** — Phase 1 Prometheus data is persisted to a local volume (`prometheus_data_b2b`). If `docker-compose down` is run with `--volumes`, 15 days of metrics are deleted. Mitigation: Phase 2 backup strategy (Grafana Cloud or RDS snapshot).
- **Limited retention** — Phase 1 15-day window is sufficient for weekly retros but insufficient for annual audits. Phase 2 extends to 90-day retention.
- **Manual dashboard creation** — Phase 1 ships 3 dashboards; future dashboards require manual JSON editing (Grafana dashboard export/import). Roadmap: Terraform-driven dashboard provisioning in v0.4.

**Rejected**:

- **CloudWatch only** — requires AWS account in Phase 1 (local-only); deferred to Phase 2.
- **Datadog** — SaaS cost (~$500+/mo at production scale); not justified for Phase 1 product demo.
- **ELK stack** (Elasticsearch + Logstash + Kibana) — operational overhead (cluster mgmt, index mgmt) exceeds Prometheus simplicity. Acceptable only if unstructured log analysis becomes critical (Phase v0.5+).
- **No observability** — APRA CPS 234 §36 audit trail would be incomplete; no proof of SLA compliance.

## ADLC Subagent Supervision Metrics (Roadmap v0.3)

Phase v0.3 will add:

- **Claude API call counter**: `claude_api_calls_total{model="haiku"|"sonnet"|"opus", project="digital-commerce"}`
- **API cost tracking**: `claude_api_cost_usd_total{model, project}`
- **Agent success rate**: `adlc_agent_success_rate{agent_name="observability-engineer"|...}`
- **Coordination overhead**: `adlc_coordination_time_seconds_total{agent="product-owner"|"cloud-architect"}`

These metrics are Phase v0.3+ and are not included in Phase 1 Prometheus config (zero code today).

## docker-compose.yml Integration

Phase 1 `docker-compose.yml` addition (future commit):

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.55.0
    container_name: ec_prometheus_b2b
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data_b2b:/prometheus
    networks:
      - ec_network_b2b

  grafana:
    image: grafana/grafana:11.3.0
    container_name: ec_grafana_b2b
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data_b2b:/var/lib/grafana
    networks:
      - ec_network_b2b

volumes:
  prometheus_data_b2b:
  grafana_data_b2b:
```

(Not committed in Phase 1 v0.1.0; roadmap for v0.2)

**Container registry exemption**: Phase 1 uses `prom/prometheus:v2.55.0` and `grafana/grafana:11.3.0` (semver-pinned, NOT `:latest`). These images are NOT in the `nnthanh101/*` registry. The exemption matches the precedent set by `infracost/infracost:ci-latest` in [terraform-validate.yml](../../.github/workflows/terraform-validate.yml) — dedicated observability tooling with no `nnthanh101/*` equivalent. Phase 2 v0.3 reassesses whether Grafana Cloud (managed) or self-hosted on ECS supersedes the local image dependency.

## Cross-References

- [b2b-blueprint.md — Production-Readiness Posture (audit logging)](../b2b-blueprint.md)
- [LEAN-5S-3T.md — 3-Tier Testing Matrix (Tier 3 integration tests feed these metrics)](../LEAN-5S-3T.md)
- [discovery-brief.md — Buyer-employee and admin persona SLA metrics](../discovery-brief.md)
- ADR-003: Anthropic Claude API (future ADLC metrics land here at v0.3)
- Phase 1 Medusa backend: `apps/backend/medusa-config.ts` (where metrics middleware will be wired)
- Phase 1 container: `docker-compose.yml` (future update to include prometheus/grafana services)
