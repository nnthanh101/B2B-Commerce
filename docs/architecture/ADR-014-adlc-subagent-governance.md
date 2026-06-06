# ADR-014: ADLC Subagent Governance — Read-First, HITL-Controlled Writes, Evidence-First

**Status**: Accepted (Governance Policy — applies from Roadmap v0.6 AI integration onwards)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`

## Summary

When B2B-Commerce integrates the **ADLC AI Gateway at Roadmap v0.6** (per [b2b-blueprint.md](../b2b-blueprint.md) Deployment Evolution Timeline), AI subagents will operate under a **read-first, HITL-controlled write, evidence-first** governance pattern. Subagents may **autonomously draft, summarise, suggest, and route** — they may **NOT autonomously send quotes, approve POs, move funds, or execute storefront mutations**. Every subagent invocation writes a JSON evidence record to `tmp/B2B-Commerce/coordination-logs/`. This ADR codifies the policy now so v0.6 execution does not rebuild governance under deadline pressure. **Zero AI code ships today.**

## 5S Sort Justification

Per `.claude/memory/feedback_5s_sort_before_delegation.md`:

1. **What current problem does it solve?** [ADR-003](./ADR-003-anthropic-direct-api.md) covers **MODEL SELECTION** (Anthropic direct vs Bedrock; Haiku vs Sonnet vs Opus). ADR-014 covers **GOVERNANCE PATTERN** (what subagents may/may not do, evidence schema, HITL gates). These are different decision classes — vendor selection vs operational policy. Without ADR-014, future AI integration becomes ad-hoc and audit gaps surface at the first APRA CPS 234 review.
2. **What breaks without it?** AI integration is retro-fitted with HITL gates after-the-fact; evidence schema is invented per-feature; subagent capabilities drift toward autonomous writes (Principle I violation). The unfair-advantage differentiator (AI-assisted quote drafting per [ADR-012](./ADR-012-quote-engine-architecture.md)) becomes a compliance liability instead of a market edge.
3. **Why not extend [ADR-003]?** ADR-003 is 80+ lines on model selection + API integration + cost tracking. Governance policy is a separate decision class spanning quote workflows, approval workflows, payment workflows, and storefront mutations — it would overwhelm ADR-003.

## Context

The **ADLC v1.2.0 framework** ships seven non-negotiable principles (per [b2b-blueprint.md](../b2b-blueprint.md) Unfair Advantage Stack #4):

1. **Acceptable Agency** — Agents prepare. Humans decide. Humans commit.
2. **Interoperability & Security** — container-first, supply-chain audited
3. **Evaluation-First** — RED-GREEN-REFACTOR before any production code
4. **Hybrid Deployment** — local-first → single AWS account → multi-region
5. **Observability** — every action has an evidence path
6. **Governance** — PO + CA coordination blocks specialist execution
7. **Agent Engineering** — 7-Skills delegation discipline

Principle I (Acceptable Agency) is the binding constraint for AI integration: **subagents cannot autonomously commit any state change that crosses a money / contract / customer-data boundary.** This includes:

- Sending a quote to a buyer (customer-visible commitment, anti-`INVISIBLE_PRIMARY_USER` requires the buyer-employee persona to see real human intent)
- Approving a quote (creates a PO obligation → money flow per [ADR-011](./ADR-011-stripe-connect-marketplace.md))
- Initiating a Stripe transfer (regulated payment per ADR-011)
- Mutating customer data (APRA CPS 234 §36 audit trail violation if AI is the only actor)

Phase 1 today: **zero AI code.** The ADLC AI Gateway is aspirational at v0.6 per [b2b-blueprint.md](../b2b-blueprint.md) — this ADR is forward-policy, not present-architecture.

## Decision

**ADLC subagents operate under read-first, HITL-controlled write, evidence-first governance, applied from v0.6 onwards.** Specifically:

### Read-First Tool Inventory (Autonomous)

These tools may run without HITL approval. They produce suggestions, drafts, summaries — never state changes.

- `search_quotes_by_buyer` — query Postgres for quotes matching a buyer + date range
- `summarize_quote_thread` — Claude summarisation of `create-quote-message` thread
- `suggest_rfq_template` — recommend an RFQ template based on buyer history
- `propose_quote_response_draft` — draft `update-quote` line items; output is a diff for HITL review
- `route_to_approver` — recommend the appropriate `approval` record approver based on company config
- `summarize_supplier_vetting_packet` — aggregate ADR-013 vetting evidence into a one-page summary

### HITL-Write Tool Inventory (Principle I Gate)

These tools require HITL confirmation before the underlying workflow runs. The AI proposes; HITL approves or rejects via the storefront / admin UI.

- `merchant-send-quote` workflow — HITL = admin / sales-manager
- `customer-accept-quote` workflow — HITL = buyer-employee (with their company's spending-limit gate per `validate-cart-completion.ts`)
- `customer-reject-quote` workflow — HITL = buyer-employee
- `merchant-reject-quote` workflow — HITL = admin / sales-manager
- `update-quote` workflow when AI-proposed — HITL = quote owner (admin)
- `create-approvals` workflow — HITL = designated approver per company config
- Stripe `payment_intent` creation (v0.4+) — HITL = buyer-employee at cart checkout

### Evidence Schema (Mandatory Per Subagent Invocation)

Every subagent invocation MUST write a JSON record to `tmp/B2B-Commerce/coordination-logs/subagent-<agent>-<date>.json` with this schema:

```json
{
  "scope_id": "b2b-commerce-<feature-or-phase>",
  "agent": "<subagent-name>",
  "model": "haiku-4.5 | sonnet-4 | opus-4",
  "date": "YYYY-MM-DD",
  "tool": "<read-first-tool-or-hitl-write-tool>",
  "decision": "suggest | summarise | draft | route | propose-write",
  "confidence": 0.0,
  "evidence_paths": ["..."],
  "hitl_required": true | false,
  "hitl_disposition": "pending | approved | rejected | bypassed",
  "cost_tags": {
    "Project": "b2b-commerce",
    "BillingTag": "customer-X",
    "Environment": "dev | staging | prod"
  }
}
```

### Model Selection Policy

Per [ADR-003](./ADR-003-anthropic-direct-api.md):

- **Haiku 4.5** — read-first tools (cost discipline; 5s response target)
- **Sonnet 4** — HITL-assisted negotiation drafting (complex reasoning; multi-turn context)
- **Opus 4** — multi-party orchestration, regulatory-sensitive drafting (rare; high-stakes)

### Audit Surface

Every AI write-action proposal surfaces in the **admin notification feed** for sales-manager review. The feed is queryable for APRA CPS 234 §36 evidence: "show me every AI-suggested quote diff for customer X in the last quarter."

### Rollback Discipline

Every AI-suggested quote diff is reversible until HITL approves the SEND workflow. Internal state machine: AI proposes → diff stored as DRAFT revision → HITL reviews → HITL approves → `merchant-send-quote` workflow runs. Until approval, the buyer-employee sees no AI activity (anti-`INVISIBLE_PRIMARY_USER` discipline at the AI layer).

### FOCUS 1.2+ Tag Set (AI Infrastructure)

- `Service=b2b-commerce-ai`
- `Environment={dev,staging,prod}`
- `Owner=cloudops`
- `CostCenter=engineering`
- `Project=b2b-commerce`
- `BillingTag={customer-X}` — multi-tenant attribution
- `ManagedBy=adlc`
- `Compliance=APRA-CPS234+ADLC-v2.0`
- `DataClassification=customer` — quote content is customer data

### CloudOps-Runbooks Integration

The ADLC CLI patterns (READONLY-first, evidence-required) for runbooks operations are the reference implementation for subagent governance in this workspace. AI subagents follow the same READONLY-only-autonomous-execution rule (per `.claude/rules/governance/operational-efficiency.md` Rule 8).

## ANZ Regulatory Context

- **APRA CPS 234 §36** — human accountability: every state-change workflow is approved by a named human (recorded in `approval` records or workflow step-state). AI proposals are evidence-of-suggestion, never evidence-of-decision.
- **CPS 230 Operational Risk** — third-party AI provider (Anthropic) is a material service provider; outage rollback is to the manual quote workflow (admin / sales-manager performs the actions the AI was suggesting).
- **AI Ethics Framework (Australian DTA voluntary)** — opt-out posture for model training (per ADR-003); explainability via the evidence schema (every AI suggestion is reviewable).

## Consequences

**Accepted**:

- Buyer-employee gets AI-assisted experience (RFQ templates, summarised quote threads) without losing the human-in-the-loop guarantee on commercially-binding actions.
- Admin / sales-manager retains approval authority on every workflow that creates a PO obligation — APRA CPS 234 §36 evidence trail is unbroken.
- Evidence schema is defined NOW (v0.1.0) so v0.6 integration consumes a known shape — no late-breaking schema refactor.
- FOCUS 1.2+ tags ensure AI cost is attributable per customer at multi-tenant operator v1.0.

**Trade-offs**:

- HITL approval introduces latency for AI-suggested actions (seconds, not minutes — UI shows "AI suggested this; approve?" inline). Acceptable: the differentiator is "AI helps you decide", not "AI decides for you".
- Evidence-schema discipline adds storage cost (~few MB per customer per year at v0.6 traffic). Acceptable: APRA CPS 234 §36 evidence cost is non-negotiable.

**Rejected**:

- **Autonomous AI agents** (no HITL gate) — violates Principle I Acceptable Agency. Non-starter.
- **Human-only quote workflows** (no AI at all) — abandons the unfair-advantage differentiator. Rejected for v0.6+; acceptable as v0.1.0–v0.5 status quo.
- **LLM-as-orchestrator** (LLM dispatches workflows directly without HITL) — opaque audit trail; fails APRA CPS 234 §36. Rejected.
- **Self-reported confidence as authorization** (AI proceeds if confidence > 0.95) — high-confidence ≠ human-decided. Rejected.

## APRA CPS 234 §36 Evidence Pattern (migrated from LEAN-5S-3T.md)

APRA CPS 234 §36 requires audit trail for information security in third-party arrangements. The ADLC evidence schema satisfies this for AI-mediated quote/approval actions:

- **Retention**: 7 years (APRA general retention; matches the Phase 2 S3 Object Lock bucket per [ADR-013](./adr-013-anz-marketplace-supplier-vetting.md))
- **Content**: scope_id, agent, decision, confidence, evidence_paths, hitl_required, hitl_disposition, cost_tags (FOCUS 1.2+)
- **Immutability**: Phase 1 writes to `tmp/B2B-Commerce/coordination-logs/` (local, mutable); Phase 2 v0.3 writes to S3 Object Lock with KMS encryption (per [ADR-002](./adr-002-rds-single-az.md))
- **Audit access**: admin/sales-manager queries via admin SDK Reporting surface (Roadmap v0.3); buyer-employees see audit-status badge only

Cross-reference with [ADR-013](./adr-013-anz-marketplace-supplier-vetting.md) Layer 3 ongoing re-verification (also produces APRA-compliant evidence).

---

## Cross-References

- [ADR-003: Anthropic Claude API Direct](./adr-003-anthropic-direct-api.md) — model selection + cost tracking
- [ADR-007: Grafana + Prometheus Observability](./adr-007-grafana-prometheus-local-first.md) — subagent observability metrics land at v0.3
- [ADR-012: Quote Engine Architecture](./adr-012-quote-engine-architecture.md) — AI integration surface for quote workflows
- [ADR-011: Stripe Connect Marketplace](./adr-011-stripe-connect-marketplace.md) — payment workflows under Principle I gate
- [b2b-blueprint.md — Unfair Advantage Stack + Deployment Evolution Timeline](../b2b-blueprint.md)
- [readiness-scorecard.md](../readiness-scorecard.md) — Phase 1 KPI gates
- [discovery-brief.md — Buyer-employee + admin personas remain primary actors](../discovery-brief.md)
- Memory: `.claude/memory/MEMORY.md` (ADLC framework context)
