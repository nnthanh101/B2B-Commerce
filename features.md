# Product Backlog — INVEST User Stories

This file holds **only product/user-facing stories** that satisfy **INVEST**: **I**ndependent, **N**egotiable, **V**aluable, **E**stimable, **S**mall, **T**estable. Technical, infrastructure, and utility work lives in [`TODO.md`](./TODO.md).

**Conventions**

- Story: *As a `<role>`, I want `<capability>`, so that `<outcome>`.*
- Each story is independently shippable and has testable acceptance criteria (Given / When / Then).
- Size: **S** = ≤2 days, **M** = ≤1 week. Anything larger must be split.
- Status: `todo` · `in-progress` · `done`.

**Roles:** Buyer · Company Admin · Sales Manager · Platform Admin.

---

## Epic A — Company Accounts & Onboarding

### US-A1 — Create a company account · `S` · `todo`
*As a Company Admin, I want to register my company, so that my organization can transact under one account.*
- **Given** a valid business email **When** I submit company name, address, and admin details **Then** a company account is created and I become its admin.
- **And** an audit event `company.created` is emitted.

### US-A2 — Invite an employee · `S` · `todo`
*As a Company Admin, I want to invite an employee by email, so that my team can buy under company terms.*
- **Given** I am a Company Admin **When** I invite an email **Then** the invitee receives a tokenized invite that expires in 7 days.
- **And** re-inviting refreshes the token without creating duplicates.

### US-A3 — Accept an invite · `S` · `todo`
*As a Buyer, I want to accept an invite and set my password, so that I can access my company's catalog.*
- **Given** a valid, unexpired invite **When** I set a password **Then** my buyer account is linked to the company and the invite is consumed.
- **And** an expired/used token is rejected with a clear message.

## Epic B — Roles & Delegated Authority

### US-B1 — Assign a role · `S` · `todo`
*As a Company Admin, I want to assign roles to employees, so that authority matches responsibility.*
- **Given** an employee in my company **When** I set their role (Buyer / Company Admin / Sales Manager) **Then** their permissions update on next request.

### US-B2 — Role-restricted actions · `S` · `todo`
*As a Platform Admin, I want roles enforced server-side, so that users cannot exceed their authority.*
- **Given** a Buyer without approval rights **When** they attempt to approve an order **Then** the API returns 403 and emits `authz.denied` — regardless of UI state.

## Epic C — Spending Limits

### US-C1 — Set a spending limit · `S` · `todo`
*As a Company Admin, I want per-employee spending limits with a reset period, so that I control procurement exposure.*
- **Given** an employee **When** I set a limit and reset frequency (none / daily / weekly / monthly) **Then** the limit is stored and shown on their profile.

### US-C2 — Enforce the limit at checkout · `M` · `todo`
*As a Company Admin, I want over-limit checkouts blocked, so that unauthorized spend cannot occur.*
- **Given** a Buyer with a remaining limit of X **When** their cart total exceeds X **Then** checkout is blocked and routed to approval, and `spend.limit.blocked` is emitted.

### US-C3 — Reset the limit on schedule · `S` · `todo`
*As a Buyer, I want my limit to reset each period, so that I can keep ordering within policy.*
- **Given** a weekly limit **When** the period rolls over **Then** the consumed amount resets to zero at the period boundary.

## Epic D — Cart Approval

### US-D1 — Submit a cart for approval · `S` · `todo`
*As a Buyer, I want to submit my cart for approval, so that a manager can authorize the spend.*
- **Given** a cart requiring approval **When** I submit it **Then** its status becomes `pending-approval` and approvers are notified.

### US-D2 — Approve or reject with a note · `S` · `todo`
*As a Sales Manager, I want to approve or reject a cart with a note, so that decisions are recorded.*
- **Given** a pending cart **When** I approve **Then** the Buyer may check out; **When** I reject with a note **Then** the cart returns to the Buyer with the reason.
- **And** both outcomes emit an `approval.decided` evidence event with the approver id.

## Epic E — Quote-to-Order

### US-E1 — Request a quote · `S` · `todo`
*As a Buyer, I want to request a quote on my cart, so that I can negotiate enterprise pricing.*
- **Given** a cart **When** I request a quote **Then** a quote is created in `requested` status and Sales is notified.

### US-E2 — Negotiate a quote · `M` · `todo`
*As a Sales Manager, I want to respond with adjusted prices/terms and messages, so that we reach agreement.*
- **Given** a requested quote **When** I send a counter with line prices and a message **Then** the Buyer sees the revision and full message thread.

### US-E3 — Accept a quote → order · `M` · `todo`
*As a Buyer, I want to accept an agreed quote, so that it converts to an order at quoted terms.*
- **Given** an accepted quote **When** I confirm **Then** an order is created at the quoted prices and the quote is locked from further edits.

## Epic F — Catalog & Ordering

### US-F1 — Browse the catalog · `S` · `todo`
*As a Buyer, I want to browse products by category/collection, so that I can find what I need.*
- **Given** the storefront **When** I open a category **Then** products, prices, and availability render for my company's region.

### US-F2 — Bulk add to cart · `S` · `todo`
*As a Buyer, I want to add multiple SKUs at once, so that large orders are fast.*
- **Given** a bulk entry (SKU + quantity list) **When** I submit **Then** all valid lines are added and invalid SKUs are reported without losing the rest.

### US-F3 — Reorder from history · `S` · `todo`
*As a Buyer, I want to reorder a past order, so that repeat purchasing is one click.*
- **Given** a previous order **When** I choose reorder **Then** in-stock items populate a new cart and out-of-stock items are flagged.

## Epic G — ADLC AI Assist (read-first, governed)

### US-G1 — Ask the assistant for status · `S` · `todo`
*As a Buyer, I want to ask the chatbot for my order/quote status, so that I get answers without searching.*
- **Given** I am authenticated **When** I ask "where is my quote?" **Then** the assistant calls a **read-only** tool scoped to my company and returns status, emitting an evidence event. It never exposes another company's data.

### US-G2 — Draft a quote request (HITL to submit) · `M` · `todo`
*As a Buyer, I want the assistant to draft a quote request, so that I save effort — but I confirm before it is submitted.*
- **Given** a drafted quote **When** the assistant proposes submission **Then** nothing is created until I explicitly confirm (human-in-the-loop), and the submit action is policy-gated and audited.

## Epic H — Evidence & Audit

### US-H1 — Audit every commercial action · `S` · `todo`
*As a Platform Admin, I want every quote/approval/order/agent action logged with evidence, so that the platform is auditable for FSI/Energy compliance.*
- **Given** any state-changing commercial action **When** it occurs **Then** an immutable evidence event is written (actor, tool, object, risk level, policy decision, input/output hashes, trace id) per the schema in [blueprint §6](./docs/b2b-blueprint.md).

---

*Backlog seeded from blueprint §4 (MVP scope) and the in-tree Medusa B2B modules (`company`, `approval`, `quote`, `employee`). Stories are deliberately small and testable; split any that grow beyond `M`.*
