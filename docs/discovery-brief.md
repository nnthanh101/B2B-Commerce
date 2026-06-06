# Discovery Brief — B2B-Commerce (Quote-Assisted B2B-Commerce)

> **Status**: Phase 1 — local-first B2B skeleton, alpha customer OceanSoft
> **Owners**: HITL (T-Shape solo founder) + AI specialist agents (ADLC v1.2.0)
> **Scope reference**: `tmp/B2B-Commerce/coordination-logs/product-owner-b2b-commerce-p1-2026-06-04.json`

## Executive Summary

B2B-Commerce is a **quote-assisted B2B-Commerce** built on Medusa 2.x for ANZ regulated-industry buyers (Energy, FSI, Telecom). The product replaces 6-week email-PDF procurement cycles with a deterministic Quote → Approval → PO → Invoice → SOW workflow. Phase 1 ships the local-first developer skeleton today; Phase 2 lifts the same artifacts onto a single AWS account with FinOps FOCUS 1.2+ tagging.

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
- AC1: `task up` exits 0 in <600 seconds on cold-cache fresh clone (evidence: `tmp/B2B-Commerce/test-results/startup-time-YYYY-MM-DD.txt`)
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

---

## Phase 2 Sprint Plan — INVEST Stories

Phase 2 v0.3 production launch backlog. 8 stories below use INVEST format. Top 5 with material error-path complexity upgrade to BDD scenarios (next section).

### Sprint 2 — Infrastructure + Modules

**INFRA-001** — Terraform modules: AppRegistry + VPC + RDS
- **As an** infrastructure-engineer
- **I want** AppRegistry + VPC (1 AZ at v0.3, 2 public + 2 private subnets, NAT-less) + RDS Postgres 15 Single-AZ provisioned via Terraform module
- **So that** Phase 2 AWS surface is reproducible, FOCUS-tagged, and matches [adr-001](./architecture/adr-001-single-aws-account.md) + [adr-002](./architecture/adr-002-single-region-deployment.md) stance
- **Acceptance criteria**:
  - [ ] `terraform plan` clean; VPC ID + RDS endpoint exported
  - [ ] FOCUS 9-key tag set applied to all resources (verify with `infracost breakdown`)
  - [ ] AppRegistry application registered for cost attribution (myApplications surface)
  - [ ] Single-AZ posture documented per [adr-002](./architecture/adr-002-single-region-deployment.md) trigger table
- **Owner**: infrastructure-engineer | **Sprint**: 2 | **Story**: OS-020

**INFRA-002** — Terraform modules: ECS Fargate + ALB + SGs
- **As an** infrastructure-engineer
- **I want** ECS Fargate **on-demand** for backend (in-flight workflow durability) + ECS Fargate **Spot** for storefront + ALB + security groups
- **So that** Medusa backend has durable runtime AND storefront benefits from Spot cost savings without workflow risk
- **Acceptance criteria**:
  - [ ] ECS cluster + task definitions deployed; backend uses Fargate on-demand
  - [ ] Storefront uses Fargate Spot with graceful interruption handling
  - [ ] ALB DNS resolves; security groups respect least-privilege
- **Owner**: infrastructure-engineer | **Sprint**: 2 | **Story**: OS-021

**INFRA-003** — Amplify Hosting (storefront)
- **As a** fullstack-engineer / infrastructure-engineer
- **I want** AWS Amplify app with GitHub integration + custom domain + env vars from SSM
- **So that** storefront deploys on tag push with edge caching and HTTPS
- **Acceptance criteria**:
  - [ ] Amplify app URL + custom domain CNAME records configured
  - [ ] Tag-push trigger drives deploy (per [adr-006](./architecture/adr-006-tag-only-github-actions.md))
  - [ ] Env vars sourced from SSM Parameter Store
- **Owner**: infrastructure-engineer | **Sprint**: 3 | **Story**: OS-031

**CORE-001** — Medusa custom modules: digital-product, licence, entitlement, chat-budget
- **As a** medusa-commerce-engineer
- **I want** 4 custom modules scaffolded with migrations + unit tests
- **So that** B2B-specific commerce (licence-based digital goods, chat budget enforcement) is wired into Medusa OOTB-extended pattern (per [adr-010](./architecture/adr-010-medusa-module-pattern.md))
- **Acceptance criteria**:
  - [ ] `pnpm test:unit` ≥70% coverage on new module files
  - [ ] Medusa migrations green
  - [ ] Cross-module links exercised in integration test
- **Owner**: medusa-commerce-engineer | **Sprint**: 2 | **Story**: OS-022

**CORE-003** — Postgres FTS (tsvector + pg_trgm)
- **As a** medusa-commerce-engineer
- **I want** Postgres FTS endpoint at `/store/products/search?q=...` (per [adr-005](./architecture/adr-005-postgres-fts-no-algolia.md))
- **So that** Phase 2 product search ships without Algolia dependency
- **Acceptance criteria**:
  - [ ] FTS index created on product table
  - [ ] Query returns ranked results in <100ms for 1000 products
  - [ ] Algolia migration trigger documented per [adr-005](./architecture/adr-005-postgres-fts-no-algolia.md)
- **Owner**: medusa-commerce-engineer | **Sprint**: 2 | **Story**: OS-024

**FRONT-001** — Storefront rebrand
- **As a** fullstack-engineer
- **I want** storefront rebranded to OceanSoft brand (colors, logo, nav, PayPal UI removed)
- **So that** Phase 2 launch presents OceanSoft as the alpha customer's brand
- **Acceptance criteria**:
  - [ ] Visual screenshots in evidence path
  - [ ] PayPal UI residue removed (waste cleanup per [adr-008](./architecture/adr-008-medusa-modules-reuse-vs-new.md) module reuse decision)
- **Owner**: fullstack-engineer | **Sprint**: 3 | **Story**: OS-030

**FINOPS-001** — CUR 2.0 + Athena FOCUS view
- **As a** finops-engineer
- **I want** AWS CUR 2.0 export + Glue crawler + Athena FOCUS view + weekly materialized query
- **So that** FOCUS-tagged spend is queryable per [adr-001](./architecture/adr-001-single-aws-account.md) 9-key schema
- **Acceptance criteria**:
  - [ ] CUR 2.0 exports to S3 daily
  - [ ] Athena query returns spend by Service + Environment
  - [ ] Weekly materialization runs via EventBridge
- **Owner**: finops-engineer | **Sprint**: 3 | **Story**: OS-033

**OPS-001** — CloudWatch alarms (5 total)
- **As an** observability-engineer
- **I want** 5 CloudWatch alarms (5xx rate, latency p95, RDS conn, chat spend, CPU) + SNS topic
- **So that** Phase 2 production has minimum-viable observability per [adr-007](./architecture/adr-007-grafana-prometheus-local-first.md) Phase 2 plan
- **Acceptance criteria**:
  - [ ] 5 alarms created + SNS email subscription verified
  - [ ] Chat spend alarm threshold = $40/mo (closes G-09)
- **Owner**: observability-engineer | **Sprint**: 3 | **Story**: OS-034

**QA-001** — Playwright E2E smoke
- **As a** qa-automation-engineer
- **I want** Playwright E2E covering signup → cart → checkout → confirmation
- **So that** Phase 2 launch has minimum-viable regression coverage
- **Acceptance criteria**:
  - [ ] Playwright tests pass in CI
  - [ ] Screenshots captured for HITL review
- **Owner**: qa-automation-engineer | **Sprint**: 3 | **Story**: OS-035

**DORA-001** — DORA 4-metric baseline
- **As an** observability-engineer
- **I want** DORA 4 metrics (deploy freq, lead time, MTTR, change fail rate) emitted to CloudWatch + SQLite
- **So that** delivery performance is measurable from v1.0.0 onward (closes G-10)
- **Acceptance criteria**:
  - [ ] Metrics emitted on every deploy
  - [ ] Baseline values logged
- **Owner**: observability-engineer | **Sprint**: 4 | **Story**: OS-042

**RUN-001** — 5 support runbooks
- **As a** sre-engineer
- **I want** 5 runbooks (RDS conn saturation, Fargate Spot interruption, webhook reconciliation, 429, 5xx)
- **So that** on-call has playbooks (closes G-04)
- **Acceptance criteria**:
  - [ ] 5 runbooks in `docs/runbooks/`
  - [ ] Each tested in dev env; RTO/RPO verified
- **Owner**: sre-engineer | **Sprint**: 4 | **Story**: OS-044

---

## Phase 2 Top Stories — BDD Scenarios

5 stories below upgrade to BDD because error-path materially changes the design. Standard INVEST sufficient for the other 8 (see preceding section).

### OS-003 — Production AWS Account Setup (CRIT)

**Story**: As the HITL, I want a production AWS account provisioned with MFA root, CloudTrail, GuardDuty, Config, and Budgets, so that Phase 2 v0.3 deploys land in a compliant, observable account from day one.

**Scenario 1 — Happy path**:
- **Given** I have a corporate email + payment method
- **When** I create the AWS account, enable MFA on root, and run the bootstrap CloudFormation
- **Then** CloudTrail logs to S3 (encrypted), GuardDuty is enabled, Config records 100% of resources, and Budgets alert at 80% of customer-configured monthly cap
- **And** Account ID + root MFA + CloudTrail S3 ARN are written to evidence path

**Scenario 2 — Quota escalation**:
- **Given** the new account has default service quotas
- **When** Phase 2 v0.3 needs ≥4 vCPUs for Fargate baseline
- **Then** I file a quota increase request BEFORE Sprint 2 INFRA-001/002 starts
- **And** Sprint 2 cannot start until quota approved (HITL gate)

**Owner**: cloud-architect + HITL | **Sprint**: 0 | **Gap closure**: G-01

### OS-005 — Stripe AU Verification + Sandbox Fallback (HIGH)

**Story**: As the HITL, I want Stripe AU business verification started in Sprint 0 with sandbox keys covering Sprints 1-3, so that production launch in Sprint 4 has approved keys OR a Stripe Direct fallback.

**Scenario 1 — Happy path (approved by Sprint 4)**:
- **Given** ABN + director verification submitted in Sprint 0
- **When** Stripe approves before Sprint 4 cutover
- **Then** production keys swap in via SSM Parameter Store update
- **And** first $1 test transaction reconciles successfully

**Scenario 2 — Fallback path (delay >Sprint 4)**:
- **Given** Stripe approval delayed beyond Sprint 4 target
- **When** v1.0.0 needs to ship
- **Then** demo mode ships with Stripe sandbox + mock-fallback branch enabled
- **And** production cutover deferred to v1.0.1 + HITL stakeholder communication

**Owner**: HITL + devops-security-engineer | **Sprint**: 0 + 4 | **Gap closure**: G-02

### OS-032 — Chat Widget /api/chat with Budget Enforcement

**Story**: As a buyer-employee, I want to chat with an AI assistant about products with a token budget enforced, so that I get help WITHOUT OceanSoft accruing runaway Claude API costs.

**Scenario 1 — Happy path (within budget)**:
- **Given** my session has tokens remaining
- **When** I send a chat message
- **Then** the `/api/chat` Next.js Server Action streams response via Anthropic SDK with prompt caching enabled
- **And** token count + cost_usd logged to CloudWatch (closes G-05)
- **And** session budget decremented

**Scenario 2 — Budget exhausted**:
- **Given** my session reached its token cap
- **When** I send another message
- **Then** API returns 429 with graceful UI degradation ("budget reached; reset at midnight UTC")
- **And** alarm fires at $40/mo aggregate spend (closes G-09)

**Owner**: fullstack-engineer + ai-systems-architect | **Sprint**: 3 | **Gap closure**: G-05 + G-09

### OS-041 — Production Deploy + App-Only Rollback (RTO ≤15 min)

**Story**: As an SRE, I want a production deploy with app-only rollback (RTO ≤15 min) and additive-only schema migrations, so that v1.0.0 ships with a defensible rollback story for the GO-gate.

**Scenario 1 — Happy path**:
- **Given** v1.0.0 tag passes CI + tag-audit (per [adr-006](./architecture/adr-006-tag-only-github-actions.md))
- **When** prod Terraform apply runs blue-green via ALB target swap
- **Then** new ECS task definition serves 100% traffic; old revision held warm for 15 min
- **And** smoke test passes; DORA deploy_freq metric increments

**Scenario 2 — Rollback path**:
- **Given** smoke test fails OR P1 incident in first 15 min
- **When** rollback triggered
- **Then** ALB target swap reverts to previous ECS task definition (<5 min)
- **And** DB stays at current schema (additive-only migrations enable DB-newer-than-app); app-newer-than-DB not required
- **And** rollback completes within RTO 15 min (app-only; DB restore NOT in rollback scope — DB stays current)

**Migration discipline AC**:
- [ ] All schema migrations are additive-only (new columns, new tables; no breaking drops in same release)
- [ ] App handles DB-newer-than-app for rolled-back revisions (build-time invariant)
- [ ] Breaking schema changes require a 2-release migration: (release N: add new, dual-write) → (release N+1: drop old)

**Owner**: infrastructure-engineer + sre-engineer | **Sprint**: 4 | **Gap closure**: G-04 (rollback runbook)

### OS-043 — Production Smoke + FOCUS Tag Audit

**Story**: As a finops-engineer, I want post-deploy smoke + FOCUS tag audit that gates v1.0.0 GO-decision, so that production launch is compliant with the unfair-advantage FinOps pillar from day one.

**Scenario 1 — Happy path**:
- **Given** prod Terraform apply complete
- **When** smoke test + `/commerce:tag-audit` runs
- **Then** smoke test PASSED; tag audit exit 0 (100% of resources carry the 9-key FOCUS set)
- **And** prod spend visible in FOCUS Athena view within 24h

**Scenario 2 — Tag-audit failure**:
- **Given** any resource missing a required FOCUS tag
- **When** tag-audit runs
- **Then** GO-gate FAILED; HITL notified; tag remediation required before v1.0.0 release
- **And** delay logged + alarm fired

**Owner**: qa-automation-engineer + finops-engineer | **Sprint**: 4 | **Gap closure**: validates FOCUS pillar

---

## Product User Stories — Epic A–H (INVEST + BDD)

Functional B2B product backlog: 17 user stories across 8 epics. INVEST + BDD compliant; sized S (≤2 days) or M (≤1 week); status `todo` by default.

**Audience**: alpha customer OceanSoft + Energy/FSI/Telecom prospects evaluating the marketplace feature set. Distinct from the Phase 2 Sprint Plan above (engineering work) — these are the buyer/admin/sales/platform user-facing capabilities.

**Roles**: Buyer · Company Admin · Sales Manager · Platform Admin.

**Audit event wire contract (v0.4 OpenTelemetry shipper)**: `company.created`, `employee.invited`, `authz.denied`, `spend.limit.blocked`, `approval.decided`.

---

### Epic A — Company Accounts & Onboarding

#### US-A1 — Create a company account · `S` · `todo`

_As a Company Admin, I want to register my company, so that my organization can transact under one account._

- **Given** a valid business email **When** I submit company name, address, and admin details **Then** a company account is created and I become its admin.
- **And** an audit event `company.created` is emitted.

*Implementation status*: **BUILT** — company module per [adr-008](./architecture/adr-008-medusa-modules-reuse-vs-new.md); B2B Commerce foundation.

#### US-A2 — Invite an employee · `S` · `todo`

_As a Company Admin, I want to invite an employee by email, so that my team can buy under company terms._

- **Given** I am a Company Admin **When** I invite an email **Then** the invitee receives a tokenized invite that expires in 7 days.
- **And** re-inviting refreshes the token without creating duplicates.
- **And** an audit event `employee.invited` is emitted.

*Implementation status*: **BUILT** — employee invite workflow + storefront `invite-employee-card` component.

#### US-A3 — Accept an invite · `S` · `todo`

_As a Buyer, I want to accept an invite and set my password, so that I can access my company's catalog._

- **Given** a valid, unexpired invite **When** I set a password **Then** my buyer account is linked to the company and the invite is consumed.
- **And** an expired/used token is rejected with a clear message.

*Implementation status*: **PARTIAL** — invite acceptance flow exists; token expiry edge cases need Sprint 2 hardening.

---

### Epic B — Roles & Delegated Authority

#### US-B1 — Assign a role · `S` · `todo`

_As a Company Admin, I want to assign roles to employees, so that authority matches responsibility._

- **Given** an employee in my company **When** I set their role (Buyer / Company Admin / Sales Manager) **Then** their permissions update on next request.

*Implementation status*: **BUILT** — role assignment in company module.

#### US-B2 — Role-restricted actions · `S` · `todo`

_As a Platform Admin, I want roles enforced server-side, so that users cannot exceed their authority._

- **Given** a Buyer without approval rights **When** they attempt to approve an order **Then** the API returns 403 and emits `authz.denied` — regardless of UI state.

*Implementation status*: **PARTIAL** — server-side role checks in approval workflow; `authz.denied` audit event Sprint 2 wiring.

---

### Epic C — Spending Limits

#### US-C1 — Set a spending limit · `S` · `todo`

_As a Company Admin, I want per-employee spending limits with a reset period, so that I control procurement exposure._

- **Given** an employee **When** I set a limit and reset frequency (none / daily / weekly / monthly) **Then** the limit is stored and shown on their profile.

*Implementation status*: **PARTIAL** — limit storage BUILT; admin REST API for limit management Roadmap v0.2 (per [b2b-blueprint Features Matrix](./b2b-blueprint.md)).

#### US-C2 — Enforce the limit at checkout · `M` · `todo`

_As a Company Admin, I want over-limit checkouts blocked, so that unauthorized spend cannot occur._

- **Given** a Buyer with a remaining limit of X **When** their cart total exceeds X **Then** checkout is blocked and routed to approval, and `spend.limit.blocked` is emitted.

*Implementation status*: **BUILT** — cart-validation hook at `apps/backend/src/workflows/hooks/validate-cart-completion.ts` per [adr-008](./architecture/adr-008-medusa-modules-reuse-vs-new.md).

#### US-C3 — Reset the limit on schedule · `S` · `todo`

_As a Buyer, I want my limit to reset each period, so that I can keep ordering within policy._

- **Given** a weekly limit **When** the period rolls over **Then** the consumed amount resets to zero at the period boundary.

*Implementation status*: **NOT BUILT** — scheduled reset job not implemented (no `jobs/` or `subscribers/` for this); Sprint 2 task.

---

### Epic D — Cart Approval

#### US-D1 — Submit a cart for approval · `S` · `todo`

_As a Buyer, I want to submit my cart for approval, so that a manager can authorize the spend._

- **Given** a cart requiring approval **When** I submit it **Then** its status becomes `pending-approval` and approvers are notified.

*Implementation status*: **BUILT** — approval workflows at `apps/backend/src/workflows/approval/workflows/`.

#### US-D2 — Approve or reject with a note · `S` · `todo`

_As a Sales Manager, I want to approve or reject a cart with a note, so that decisions are recorded._

- **Given** a pending cart **When** I approve **Then** the Buyer may check out; **When** I reject with a note **Then** the cart returns to the Buyer with the reason.
- **And** both outcomes emit an `approval.decided` evidence event with the approver id.

*Implementation status*: **PARTIAL** — status flip BUILT (per [adr-008](./architecture/adr-008-medusa-modules-reuse-vs-new.md)); `note` field gap in approval model (Sprint 2 model extension).

---

### Epic E — Quote-to-Order

#### US-E1 — Request a quote · `S` · `todo`

_As a Buyer, I want to request a quote on my cart, so that I can negotiate enterprise pricing._

- **Given** a cart **When** I request a quote **Then** a quote is created in `requested` status and Sales is notified.

*Implementation status*: **BUILT** — `create-request-for-quote.ts` workflow per [adr-012](./architecture/adr-012-quote-engine-architecture.md). *Audience-split note*: complements the representative quote-request story in the Sprint Plan above — this story is the canonical product-feature catalog entry; the Sprint Plan story tracks engineering delivery.

#### US-E2 — Negotiate a quote · `M` · `todo`

_As a Sales Manager, I want to respond with adjusted prices/terms and messages, so that we reach agreement._

- **Given** a requested quote **When** I send a counter with line prices and a message **Then** the Buyer sees the revision and full message thread.

*Implementation status*: **BUILT** — `create-quote-message.ts`, `merchant-send-quote.ts`, `update-quote.ts` workflows per [adr-012](./architecture/adr-012-quote-engine-architecture.md).

#### US-E3 — Accept a quote → order · `M` · `todo`

_As a Buyer, I want to accept an agreed quote, so that it converts to an order at quoted terms._

- **Given** an accepted quote **When** I confirm **Then** an order is created at the quoted prices and the quote is locked from further edits.

*Implementation status*: **BUILT** — `customer-accept-quote.ts` workflow per [adr-012](./architecture/adr-012-quote-engine-architecture.md).

---

### Epic F — Catalog & Ordering

#### US-F1 — Browse the catalog · `S` · `todo`

_As a Buyer, I want to browse products by category/collection, so that I can find what I need._

- **Given** the storefront **When** I open a category **Then** products, prices, and availability render for my company's region.

*Implementation status*: **BUILT** — Medusa OOTB cart/order/product modules per [adr-010](./architecture/adr-010-medusa-ootb-extended.md).

#### US-F2 — Bulk add to cart · `S` · `todo`

_As a Buyer, I want to add multiple SKUs at once, so that large orders are fast._

- **Given** a bulk entry (SKU + quantity list) **When** I submit **Then** all valid lines are added and invalid SKUs are reported without losing the rest.

*Implementation status*: **BUILT** — bulk-add-to-cart validation hook at `apps/backend/src/workflows/hooks/validate-add-to-cart.ts`.

#### US-F3 — Reorder from history · `S` · `todo`

_As a Buyer, I want to reorder a past order, so that repeat purchasing is one click._

- **Given** a previous order **When** I choose reorder **Then** in-stock items populate a new cart and out-of-stock items are flagged.

*Implementation status*: **PARTIAL** — order history visible in storefront account UI; reorder one-click action Sprint 3 enhancement.

---

### Epic G — ADLC AI Assist (read-first, governed)

#### US-G1 — Ask the assistant for status · `S` · `todo`

_As a Buyer, I want to ask the chatbot for my order/quote status, so that I get answers without searching._

- **Given** I am authenticated **When** I ask "where is my quote?" **Then** the assistant calls a **read-only** tool scoped to my company and returns status, emitting an evidence event. It never exposes another company's data.

*Implementation status*: **NOT BUILT — ASPIRATIONAL Roadmap v0.6** — zero AI Gateway code today (per [adr-014](./architecture/adr-014-adlc-subagent-governance.md) read-first / HITL-write discipline + [b2b-blueprint Production-Readiness Posture](./b2b-blueprint.md#production-readiness-posture)).

#### US-G2 — Draft a quote request (HITL to submit) · `M` · `todo`

_As a Buyer, I want the assistant to draft a quote request, so that I save effort — but I confirm before it is submitted._

- **Given** a drafted quote **When** the assistant proposes submission **Then** nothing is created until I explicitly confirm (human-in-the-loop), and the submit action is policy-gated and audited.

*Implementation status*: **NOT BUILT — ASPIRATIONAL Roadmap v0.6** — HITL-write pattern defined per [adr-014](./architecture/adr-014-adlc-subagent-governance.md); zero code today.

---

### Epic H — Evidence & Audit

#### US-H1 — Audit every commercial action · `S` · `todo`

_As a Platform Admin, I want every quote/approval/order/agent action logged with evidence, so that the platform is auditable for FSI/Energy compliance._

- **Given** any state-changing commercial action **When** it occurs **Then** an immutable evidence event is written (actor, tool, object, risk level, policy decision, input/output hashes, trace id) per the schema in [b2b-blueprint Production-Readiness Posture](./b2b-blueprint.md#production-readiness-posture).

*Implementation status*: **PARTIAL** — some events emitted via Medusa workflow lifecycle; immutable evidence event store + complete coverage Sprint 4 (per OS-041 production deploy gate); cross-ref [adr-014](./architecture/adr-014-adlc-subagent-governance.md) APRA CPS 234 §36 evidence pattern.

---

*Backlog seeded from blueprint Features Matrix and the in-tree Medusa B2B modules (`company`, `approval`, `quote`, `employee`). Stories are deliberately small and testable; split any that grow beyond `M`. Roles map to existing storefront B2B account UI (25 components) + Medusa admin SDK approval surface.*

---

## Evidence cross-references

- Module reality: `apps/backend/src/modules/{company,quote,approval}/` (3 modules wired in `medusa-config.ts`)
- Workflow reality: `apps/backend/src/workflows/quote/workflows/` (9 files), `apps/backend/src/workflows/approval/workflows/` (5 files)
- Storefront reality: `apps/storefront/src/modules/account/components/` (23 B2B account UI components)
- Coordination authority: `tmp/B2B-Commerce/coordination-logs/product-owner-b2b-commerce-p1-2026-06-04.json`
