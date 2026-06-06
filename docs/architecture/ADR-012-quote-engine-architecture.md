# ADR-012: Quote Engine = Medusa Quote Module + Custom Workflows (No Plugin, No Third-Party)

**Status**: Accepted
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`

## Summary

The **Quote Engine** — B2B-Commerce's unfair-advantage differentiator — is composed of the **OceanSoft-owned Medusa Quote module** (`apps/backend/src/modules/quote/`) plus **8 custom workflows** (`apps/backend/src/workflows/quote/workflows/`) plus **storefront Server Actions** (`apps/storefront/src/lib/data/quotes.ts`). **No Medusa quote plugin layer. No third-party quote tooling (Conga, DealHub, PandaDoc, etc.).** The ADLC AI Gateway (Roadmap v0.6) layers semantic / RFQ-template orchestration on top of these workflows — it does not replace them. This ADR makes the engine boundary explicit so future "should we add a plugin layer?" debates resolve to "no — engine is composed, not pluggable."

## 5S Sort Justification

Per `.claude/memory/feedback_5s_sort_before_delegation.md`, every new ADR justifies its existence against three questions:

1. **What current problem does it solve?** [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md) covers the **MODULE REUSE** decision (use the B2B Commerce modules vs build from scratch); ADR-012 covers the **ENGINE ARCHITECTURE** decision (workflow orchestration, state machine, message threading, ADLC integration surface). These are different concerns — one is "should we own this code?", the other is "how is the runtime composed?" Without ADR-012, the quote-assisted differentiator stays a tagline; with it, the runtime is documented for future engineers.
2. **What breaks without it?** Future engineers reinvent quote architecture (or buy a commercial quote tool) without consulting the 8 already-shipped workflows. The ADLC AI Gateway integration target is undefined; v0.6 execution debates "where do AI suggestions land?" with no anchor.
3. **Why not extend [ADR-008]?** [ADR-008] is already 100+ lines covering module ownership + IP scrub + workflow inventory at the module layer. Engine architecture is a distinct decision class (runtime composition, state machine semantics, integration surface) and conflating the two would make ADR-008 unreadable.

## Context

B2B procurement = Quote → Negotiate → Accept/Reject → PO → Invoice — the core differentiator over Shopify Plus B2B and BigCommerce B2B (per [b2b-blueprint.md](../b2b-blueprint.md) "Unfair Advantage Stack"). The engine that runs this workflow is composed of three layers (verified against the filesystem):

- **Module layer**: `apps/backend/src/modules/quote/` — quote entity, line items, status enum, message thread (data model + service).
- **Workflow layer**: `apps/backend/src/workflows/quote/workflows/` — 8 workflows verified at `index.ts`: `create-quote`, `create-quote-message`, `create-request-for-quote`, `customer-accept-quote`, `customer-reject-quote`, `merchant-reject-quote`, `merchant-send-quote`, `update-quote`.
- **Storefront layer**: `apps/storefront/src/lib/data/quotes.ts` — Server Actions per [ADR-004](./ADR-004-next-js-server-action.md); UI components under `apps/storefront/src/modules/quotes/` (referenced in [b2b-blueprint.md](../b2b-blueprint.md) Buyer-employee Journey).

The Medusa Quote module is **already shipped** (per [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md) IP-scrub directive); the workflows are **already shipped**. The question this ADR answers is: **how do these layers compose, and what is the AI integration surface?**

## Decision

**The Quote Engine is composed (not pluggable). No plugin layer between module and workflows.** Specifically:

### Quote State Machine

```
DRAFT ──merchant-send-quote──▶ SENT ──customer-accept-quote──▶ ACCEPTED
  │                              │                              │
  │                              │                              ▼
  │                              ├─customer-reject-quote──▶ REJECTED  (→ PO)
  │                              │
  │                              └─merchant-reject-quote──▶ REJECTED
  │
  └──[TTL expiry]──▶ EXPIRED
```

State transitions are owned by the workflows (not by the module service directly) — this preserves the durable-state-machine guarantee of Medusa workflows over ad-hoc service calls.

### Message Threading

`create-quote-message` workflow appends to the quote conversation. Both personas append messages (buyer-employee for clarifications, admin/sales-manager for negotiation). Thread is the source-of-truth for APRA CPS 234 §36 audit evidence — every quote conversation is queryable.

### Persona-Action Matrix

| Persona | Action | Workflow |
|---------|--------|----------|
| Buyer-employee | Submit RFQ | `create-request-for-quote` |
| Buyer-employee | Accept quote | `customer-accept-quote` |
| Buyer-employee | Reject quote | `customer-reject-quote` |
| Buyer-employee | Send clarification | `create-quote-message` |
| Admin / sales-manager | Draft quote | `create-quote` |
| Admin / sales-manager | Send quote to buyer | `merchant-send-quote` |
| Admin / sales-manager | Reject incoming RFQ | `merchant-reject-quote` |
| Admin / sales-manager | Update quote line items | `update-quote` |
| Both | Post message | `create-quote-message` |

### Storefront Integration

Per [ADR-004](./ADR-004-next-js-server-action.md), UI mutations land as Server Actions in `apps/storefront/src/lib/data/quotes.ts`. Each Server Action invokes one workflow — never bypasses the workflow layer to call the module service directly. This preserves the audit trail.

### ADLC AI Gateway Integration Surface (Roadmap v0.6)

Per [b2b-blueprint.md](../b2b-blueprint.md) v0.6 row and [ADR-014](./adr-014-adlc-subagent-governance.md), AI integration lands at v0.6 — **zero code today**. When it lands, the integration surface is:

- **Read-first** (autonomous, Haiku 4.5): `search quotes by buyer`, `summarize quote thread`, `suggest RFQ template`, `propose quote response draft`
- **HITL-write** (Principle I gate): `merchant-send-quote`, `customer-accept-quote`, `customer-reject-quote`, `merchant-reject-quote`, `update-quote` — AI proposes diff; HITL (admin / sales-manager OR buyer-employee depending on action) approves before workflow runs.
- Subagent observability metrics for these calls land earlier at v0.3 per [ADR-007](./ADR-007-grafana-prometheus-local-first.md).

### Roadmap Increments

- **v0.2** — RFQ template UI for buyer-employees (today: buyers compose from scratch; v0.2: template gallery + customisation)
- **v0.3** — async negotiation loops (timeout-based escalation: if quote SENT > N hours without buyer response, auto-route to secondary approver). See [readiness-scorecard.md](../readiness-scorecard.md) KPI gate for Phase 1 target baseline.
- **v0.4** — multi-party threading (consortium buyers — multiple buyer-employees on one quote)
- **v0.6** — ADLC AI Gateway integration per ADR-014

### ANZ Regulatory Context

Quote messages and state-change events are audit-trail content for **APRA CPS 234 §36** (human accountability). They persist in the same RDS PostgreSQL instance as the rest of Medusa state (per [ADR-002](./adr-002-rds-single-az.md)), with FOCUS 1.2+ tag `Compliance=APRA-CPS234` on the infrastructure. Quote conversation export is a v0.5 capability for annual audit bundles.

## Consequences

**Accepted**:

- The engine is composed of OceanSoft-owned modules + OceanSoft-owned workflows + OceanSoft-owned Server Actions. No third-party quote vendor in the critical path.
- Future AI integration (v0.6) has a defined surface — read-first vs HITL-write — preventing ad-hoc AI-bypasses-workflow patterns.
- Both personas (buyer-employee + admin/sales-manager) have actions on the engine — anti-`INVISIBLE_PRIMARY_USER` enforced by the persona-action matrix above.
- The 8 workflows are the public contract; module-internal changes are free as long as workflow signatures hold.

**Trade-offs**:

- Adding a new persona action requires a new workflow (not a plugin install). Acceptable: workflows are cheap to add; we own the friction.
- Async negotiation loops (v0.3) require timeout infrastructure (BullMQ or Medusa scheduled jobs). Deferred to v0.3.

**Rejected**:

- **Medusa Quote plugin layer** — adds operational overhead (plugin version, plugin compatibility matrix per Medusa release) with no functional gain. The Quote module is already OceanSoft-owned per [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md); wrapping it in a plugin layer is `PREMATURE_ABSTRACTION`.
- **Third-party quote tooling (Conga, DealHub, PandaDoc)** — extra vendor cost, integration debt, no marketplace splits (the marketplace differentiator from [ADR-011](./ADR-011-stripe-connect-marketplace.md) requires native quote → settlement linkage; third-party tools do not provide this).
- **Custom from-scratch quote engine** — duplicates the Medusa module work already shipped and IP-scrubbed per [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md). Rejected as `MOCK_DUPLICATION_OF_PRIOR_WORK`.

## Cross-References

- [ADR-008: Medusa B2B Module Reuse](./ADR-008-medusa-modules-reuse-vs-new.md) — module ownership companion
- [ADR-003: Anthropic Claude API Direct](./ADR-003-anthropic-direct-api.md) — model selection for v0.6 integration
- [ADR-004: Next.js Server Actions](./ADR-004-next-js-server-action.md) — storefront mutation pattern
- [ADR-014: ADLC Subagent Governance](./ADR-014-adlc-subagent-governance.md) — AI integration policy
- [ADR-002: RDS PostgreSQL Single-AZ](./ADR-002-rds-single-az.md) — persistence target for quote + message records
- [b2b-blueprint.md — B2B Features Matrix + Unfair Advantage Stack](../b2b-blueprint.md)
- [LEAN-5S-3T.md — 3-Tier Testing Matrix (workflow tests are Tier 3)](../LEAN-5S-3T.md)
- [discovery-brief.md — Quote-assisted workflow canonical sequence](../discovery-brief.md)
