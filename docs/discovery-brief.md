# Discovery Brief — Digital-Commerce (Quote-Assisted B2B Marketplace)

> **Status**: Phase 1 — local-first B2B skeleton, alpha customer OceanSoft
> **Owners**: HITL (T-Shape solo founder) + AI specialist agents (ADLC v1.2.0)
> **Scope reference**: `tmp/Digital-Commerce/coordination-logs/product-owner-digital-commerce-p1-2026-06-04.json`

## Executive Summary

Digital-Commerce is a **quote-assisted B2B marketplace** built on Medusa 2.x for ANZ regulated-industry buyers (Energy, FSI, Telecom). The product replaces 6-week email-PDF procurement cycles with a deterministic Quote → Approval → PO → Invoice → SOW workflow. Phase 1 ships the local-first developer skeleton today; Phase 2 lifts the same artifacts onto a single AWS account with FinOps FOCUS 1.2+ tagging.

## Why

ANZ enterprise B2B procurement is dominated by manual quote cycles, multi-party email approval threads, and PDF-based purchase orders that bypass system-of-record controls. Existing storefronts (Shopify Plus, BigCommerce B2B) optimise for self-serve checkout — they do not encode the **negotiated-price + multi-step approval + compliance-evidence** pattern that regulated buyers need.

Our wedge is the inverse: every cart enters an approval workflow by default; spending limits are enforced at the cart level; quotes carry an evidence trail from request to acceptance; and the same data is queryable by both buyer-side employees and admin/sales-manager personas through a single Medusa data model.

## LEAN Waste Taxonomy (extracted from LEAN-5S-3T.md migration)

| Waste | Where it shows up in quote-assisted B2B | Mitigation |
|---|---|---|
| Rework | Buyer-employee revises quote 3+ times due to missing SOW context | RFQ template UI (Roadmap v0.2) per ADR-012 |
| Overproduction | Admin sends quote variants without buyer signal | Quote workflows enforce buyer-initiated RFQ |
| Handoffs | Approval flow loops buyer → admin → finance → buyer | Approval module + spending-limit cart enforcement |
| Waiting | Quote sits in DRAFT 7+ days | Async negotiation loop with timeout escalation (Roadmap v0.3) |
| Inventory | Stale product catalog mismatched with supplier vetting | ADR-013 ANZ supplier vetting re-verification |
| Motion | Engineer manually checks 9 FOCUS tags before merge | CI tag-validation merge gate (ADR-006 Roadmap v0.2) |
| Defects | Doc claims contradict codebase reality | PDCA scoring + 4-way cross-validation |

---

## Who

Two personas must always appear in the user journey. If only one is named, the design has failed (anti-pattern: `INVISIBLE_PRIMARY_USER`).

| Persona | Role | Trigger Action | Primary Pain |
|---------|------|----------------|--------------|
| **Buyer-employee** | Field engineer, ops lead, or procurement analyst at a customer company | Logs in, adds items to cart, requests quote | Cannot self-serve regulated purchases; waits days for manager sign-off via email |
| **Admin / sales-manager** | Internal sales rep OR customer-side approver | Reviews quote, approves or rejects, sends PO | Has no audit trail of who approved what; spends time chasing buyers for PO numbers |

A third stakeholder — the **finance team** — consumes the evidence (PO numbers, FOCUS-tagged spend) but does not appear in the active workflow.

## What

The Phase 1 deliverable is a vertical-slice MVP: one buyer-employee can request a quote, one admin can approve it, one workflow runs end-to-end on a fresh laptop checkout in under 10 minutes. The 9 INVEST-validated stories (DC-001 through DC-040) covering this slice are catalogued in the PO coordination log (see header reference). This brief surfaces 5 representative stories framed for non-technical readers.

### Quote-assisted workflow (canonical sequence)

```
1. Quote Request    — buyer-employee adds items, submits RFQ
2. Approval         — admin/sales-manager reviews, accepts or rejects
3. Purchase Order   — accepted quote converts to PO with company reference
4. Invoice          — PO triggers invoice (post-Phase 1 — module exists, not wired)
5. SOW              — long-form orders generate Statement of Work (v0.3 roadmap)
6. Implementation   — bundle delivery + spend posted to FinOps tag stream
```

Built today: steps 1–3 (Medusa company, quote, approval modules + 9 quote workflows in `apps/backend/src/workflows/quote/`). Steps 4–6 are roadmap.

### Representative INVEST user stories

#### US-DB-01: Fresh-laptop developer skeleton (DC-001)

**As a** new contributor / HITL re-cloning the repo
**I want** `task up` to bring the full B2B stack online in under 10 minutes on a clean laptop
**So that** I can demonstrate the product to a prospect without 2 days of environment setup

**Acceptance criteria** (excerpt — full AC in coordination log):
- AC1: `task up` exits 0 in <600 seconds on cold-cache fresh clone (evidence: `tmp/Digital-Commerce/test-results/startup-time-YYYY-MM-DD.txt`)
- AC2: 4 services healthy: postgres, redis, ec (backend), storefront
- AC3: Admin UI reachable at `localhost:9000/app`; storefront at `localhost:8000`

**Business value**: Time-to-demo collapses from days to minutes. Direct sales-cycle accelerant.

#### US-QA-02: Quote request from storefront (DC-012)

**As a** buyer-employee logged into a customer company account
**I want** to add B2B-priced items to my cart and submit a quote request
**So that** my manager can review and approve before purchase commits company funds

**Acceptance criteria**:
- AC1: `/account/quotes/request` route accepts cart-id and returns a quote-id within 2 seconds
- AC2: Quote record persists with `customer_id`, `company_id`, `cart_snapshot`, `status=pending_approval`
- AC3: Admin UI `/admin/quotes` shows the new request to the sales-manager within 5 seconds

**Business value**: Eliminates the email-PDF quote loop. Every quote is system-of-record from creation.

#### US-AP-03: Admin approves quote and converts to PO (DC-020)

**As an** admin / sales-manager reviewing a pending quote
**I want** to approve the quote with one click and have a PO generated automatically
**So that** I close the procurement loop without re-keying data into a separate ERP

**Acceptance criteria**:
- AC1: `/admin/quotes/{id}/approve` triggers `customer-accept-quote.ts` workflow (cited path)
- AC2: Approval record links to `company_id`, `approver_id`, `quote_id`, `approved_at` timestamp
- AC3: PO number generated and surfaced on buyer-employee's `/account/orders/{id}` page within 10 seconds
- AC4 (dual-persona — anti-INVISIBLE_PRIMARY_USER): smoke test MUST assert one step as buyer-employee AND one step as admin; admin-only test = test failure

**Business value**: Audit-grade procurement record on day one of customer rollout.

#### US-CO-04: Spending-limit enforcement at cart (DC-011 partial)

**As a** company admin
**I want** to set a per-employee spending cap and have it enforced before checkout
**So that** I do not need a separate approval flow for every routine purchase

**Acceptance criteria**:
- AC1: `validate-cart-completion.ts` hook (cited path) reads employee spending limit and blocks checkout above cap
- AC2: Blocked cart returns a structured error pointing the buyer-employee to "Request approval" CTA
- AC3: Above-cap quote requests auto-route to admin approval queue

**Business value**: Removes the "every PO needs sign-off" friction for routine spend; reserves admin attention for exceptions.

#### US-FN-05: FOCUS-tagged infrastructure cost trail (DC-030, DC-031)

**As a** finance lead at OceanSoft (and future operator customers)
**I want** every Terraform-provisioned AWS resource to carry FOCUS 1.2+ tags
**So that** I can attribute infrastructure cost to a customer, environment, and billing tag without manual allocation

**Acceptance criteria**:
- AC1: `infracost breakdown` JSON includes `Service, Environment, Owner, CostCenter, Project, BillingTag, ManagedBy, Compliance, DataClassification` on every resource
- AC2: `terraform validate` exits 0 in CI container `nnthanh101/terraform:2.6.0`
- AC3 (tightened per PO log): FOCUS tag keys present even when costs are $0 — proves wiring, not just CLI invocation

**Business value**: Multi-tenant cost attribution is wired from line 1; no retro-tagging migration when customer #2 onboards.

## Out of scope (Phase 1)

Per the PO coordination-log audit (verdict: "correctly placed"):
- Real AWS provisioning beyond `terraform validate` — Phase 2 (v0.3)
- Stripe/PayPal payment integration — v0.2
- License-key validator — v0.5 (no commercial customers yet)
- Vizro FinOps dashboards — v0.4 (no real cost data yet)
- ADLC AI Gateway / agent orchestrator — v0.6 (aspirational; zero code today)

## Evidence cross-references

- Module reality: `apps/backend/src/modules/{company,quote,approval}/` (3 modules wired in `medusa-config.ts`)
- Workflow reality: `apps/backend/src/workflows/quote/workflows/` (9 files), `apps/backend/src/workflows/approval/workflows/` (5 files)
- Storefront reality: `apps/storefront/src/modules/account/components/` (23 B2B account UI components)
- Coordination authority: `tmp/Digital-Commerce/coordination-logs/product-owner-digital-commerce-p1-2026-06-04.json`
