# Changelog — Digital-Commerce

All notable changes to Digital-Commerce follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [1.1.0] — 2026-06-04

### For business users (by persona)

#### Buyer-employee (field engineer / ops lead / procurement analyst)
- Quote-request, spending-limit enforcement, and bulk-add-to-cart flows are now formally documented as test cases (TC-E07, TC-E10, TC-E13) with Given/When/Then acceptance criteria — confirming what the buyer-employee journey covers and what remains gap. **Business-value pillar: Speed** (quote cycle 1–6 wk → hours).
- Four negative/authorization cases (TC-N01–TC-N04) define exactly what happens when a buyer-employee exceeds their spending limit or attempts unauthorized access: cart is blocked with a structured error and routed to the approval queue. **Pillar: Control**.
- Buyer-employee persona is now explicitly named in every test case — anti-pattern `INVISIBLE_PRIMARY_USER` prevented by design.

#### Admin / sales-manager (internal sales rep or customer-side approver)
- Admin quote-review → approve/reject path (TC-E11, TC-E12) and cross-company denial (TC-N03) are documented with persona column and target tier — confirming the gatekeeper path has design coverage. **Pillar: Auditability + Compliance** (APRA CPS 234 §36 approval evidence trail).
- Spending-limit restoration defect: `apps/backend/src/utils/check-spending-limit.ts` and `apps/backend/src/utils/get-cart-approval-status.ts` were identified as at-risk utilities via static-tier analysis; re-verified present in codebase. **Pillar: Control**.

#### Finance team (evidence consumer, secondary)
- Approval audit-trail test case (TC-E11/TC-N03) explicitly names Finance as the evidence consumer — every approval record carries approver_id + timestamp + company_id, queryable for APRA CPS 234 §36 audits. **Pillar: Auditability + Cost attribution**.

### Technical excellence

- **Automation testing (RQ1 test design)**: TEST-CASES.md updated with Persona column, 4 new Negative/Authz cases (TC-N01–TC-N04), and gap → `target: Tier 2 integration` / `target: Tier 3 e2e` mapping. Execution pending container provisioning; no case claimed covered without `task test:<tier>` exit-0 evidence.
- **Autonomous testing framework (RQ1 → RQ3 SOP)**: `docs/release-self-qa-framework.md` introduces the 7-phase repeatable Release Self-QA Framework (P0–P6) with model × component × gate table. Single-command via `/commerce:release-qa` or `task test:all` each release.
- **Visual verification posture**: Framework defines Chrome MCP (storefront :8000) + computer-use MCP (admin/terminal, display 2) screenshot gates; execution deferred to P3 when container is provisioned.
- **GTM readiness re-scored**: `docs/readiness-scorecard.md` updated — Technical Architecture 11→12 (+1) for test harness design; score moves from 49→50/100.

### Note on built vs roadmap
Quote → Approval → PO (steps 1–3) are built and test-designed. Invoice → SOW → Implementation (steps 4–6) remain roadmap. No changelog entry claims un-built steps.

---

## [1.0.0] — 2026-06-04

- Initial B2B skeleton: Medusa 2.x backend, Next.js 15 storefront, PostgreSQL + Redis via Docker Compose.
- 3 Medusa modules wired: company, quote, approval.
- 22 workflows across quote (9), approval (5), company (5), employee (3) workflow folders.
- 23 storefront B2B account UI components.
- Spending-limit cart validation hook (`validate-cart-completion.ts`).
- Bulk-add-to-cart and update-cart hooks.
- Terraform IaC skeleton validates via `nnthanh101/terraform:2.6.0` container.
- FOCUS 1.2+ 9-key tag strategy documented in ADR-001/006.
- 4/15 E2E cases passing (27% coverage, baseline).
