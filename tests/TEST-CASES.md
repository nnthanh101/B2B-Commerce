# TEST-CASES — OceanSoft B2B Commerce

Story-mapped test cases for Cycle 1 (DC-001..DC-050) and Cycle 2 (DC-051..DC-105). Status: covered = implemented in e2e suite; gap = not yet automated.

---

## Tier 1 — Static (TypeScript + Lint)

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-S01 | Backend TypeScript compiles | Codebase in clean state / run tsc --noEmit / exits 0 | gap |
| TC-S02 | Storefront TypeScript compiles | Codebase in clean state / run tsc --noEmit in storefront / exits 0 | gap |
| TC-S03 | Lint passes | All workspace files / run task lint / zero ESLint errors | gap |

---

## Tier 2 — Unit (Jest — NOT YET PROVISIONED)

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-U01 | Company create validates required fields | Valid company payload / call createCompany() / returns company entity | gap |
| TC-U02 | Spending limit enforced | Employee with limit=100 / attempt order totalling 150 / throws SpendingLimitExceeded | gap |
| TC-U03 | Quote state machine: draft → submitted | Quote in draft state / call submitQuote() / state equals submitted | gap |
| TC-U04 | Approval gate blocks unapproved order | Order requiring approval / call placeOrder() without approval / throws ApprovalRequired | gap |

---

## Tier 3b — E2E (Playwright — tests/e2e/)

### DC-001..DC-010: Authentication + Health

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-E01 | Backend health endpoint responds | Stack is running / GET /health / returns 200 OK | covered |
| TC-E02 | Admin login succeeds | Valid admin credentials / POST /auth/admin / returns JWT token | covered |
| TC-E03 | Storefront home loads | Stack is running / GET http://localhost:8000 / returns HTML 200 | covered |

### DC-011..DC-030: Company + Employee Management

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-E04 | Create B2B company | Authenticated admin / POST /admin/companies / company appears in list | covered |
| TC-E05 | Add employee to company | Company exists / POST /admin/companies/:id/members / member count increments | gap |
| TC-E06 | Set employee spending limit | Employee exists / PATCH /admin/companies/:id/members/:eid / limit stored | gap |

### DC-031..DC-060: Quote Negotiation

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-E07 | Create quote request | B2B buyer authenticated / POST /store/quotes / quote in draft state | gap |
| TC-E08 | Admin responds to quote | Quote in submitted state / PATCH /admin/quotes/:id / quote in negotiation state | gap |
| TC-E09 | Buyer accepts quote | Quote in negotiation / POST /store/quotes/:id/accept / quote accepted | gap |

### DC-061..DC-085: Approval Workflows

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-E10 | High-value order triggers approval | Order total > spending limit / place order / status = pending_approval | gap |
| TC-E11 | Manager approves order | Order pending approval / POST /admin/approvals/:id/approve / order confirmed | gap |
| TC-E12 | Manager rejects order | Order pending approval / POST /admin/approvals/:id/reject / order cancelled | gap |

### DC-086..DC-105: Bulk Operations + Order Editing

| ID | Brief | Given / When / Then | Status |
|----|-------|---------------------|--------|
| TC-E13 | Bulk add-to-cart | Product list with 5 SKUs / POST /store/carts/:id/line-items (batch) / cart has 5 items | gap |
| TC-E14 | Post-order edit (add item) | Confirmed order / POST /admin/orders/:id/edits / edit request created | gap |
| TC-E15 | Post-order edit (remove item) | Order edit in progress / DELETE line item / item removed, totals recalculated | gap |

---

Coverage summary: 4 covered / 15 total (27%). Target v0.2: >=60% Tier 3b coverage.
