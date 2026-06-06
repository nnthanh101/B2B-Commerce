# Admin Persona — David

> CUSTOMER-SIDE governor. Owns 4 flows (02, 03, 08, 11). Distinct from the seller-side sales-manager.

---

## Role

David is a company procurement administrator at a customer company — the buyer-side approver who onboards the team, sets spending limits, approves or rejects quotes, and keeps every euro inside company policy.

---

## Goal / JTBD

> "When my team needs to transact, I want to onboard members, set their limits, approve or edit orders, and keep an audit trail, so I can let the team move fast while every euro stays inside company policy."

---

## Top-3 Pains and Gains

| # | Pain (before) | Gain (after) |
|---|---------------|--------------|
| 1 | No visibility into who is spending what — discovers overages at month-end, not checkout | Approval dashboard shows pending quotes, line items, and total-versus-budget in real time (flow 02) |
| 2 | Manual email approvals create delays and leave no audit trail — decisions are untrackable | One-click approve or reject with comment; status auto-updates; buyer notified immediately; immutable record retained (flow 02) |
| 3 | Onboarding members is manual; post-placement order edits require a re-order and an apology | Invite by email-token with limit pre-set; edit orders post-placement with buyer notification — no re-order churn (flows 11, 08, 03) |

---

## Success Metric

**0 out-of-policy orders (overage attempts blocked or trail-logged)**

Measured by: flow 04 enforcement test — attempt an over-limit submit; assert system block or flag plus audit-row creation (test-side assertion in the E2E suite).

---

## Flow Ownership (David owns 4 of 11)

| Flow | Title | David's goal for this reel |
|------|-------|---------------------------|
| 02 | Approval | Approve or reject a quote with a comment and an audit trail in one click |
| 03 | Company Management | Govern members, roles, and limits from one company console |
| 08 | Order Edit | Edit an order post-placement for a customer change; buyer is notified — no re-order churn |
| 11 | Invite Employee | Generate and track an invite; employee accepts via token (email delivery is deferred — GAP-006; this reel voices the green token-accept slice only) |

**Participant (not owner):** Flow 04 (spending limit enforcement) — David sets the limit; Maria (buyer-employee) owns the reel because enforcement is the buyer-facing value. Flow 02 seller-side — sales-manager Sofia participates as the seller awaiting the cleared deal; David owns the approve-action.

---

## 5W1H

| Dimension | Answer |
|-----------|--------|
| **Why** | Governance is the B2B differentiator; the admin makes spend safe — without him the demo looks like consumer e-commerce, not enterprise B2B |
| **What if missing** | No governance story; approval and audit reels (02, 03, 08, 11) have no goal-owner — feature-tour regression |
| **Business value** | 0 out-of-policy orders = CFO-credible spend control; immutable audit trail = CPS 234 §36 defensibility |
| **Purpose** | Open governance reels (02, 03, 08, 11) with David's policy-control goal — spend safety as a product outcome |
| **Critical thinking** | Flow 11 is the evidence-bound trap: assert only the green token-accept slice (accept() implemented, invite migration applied); never voice email delivery (GAP-006 deferred). Stub overlap with sales-manager is resolved: David = customer-side approver; Sofia = seller-side negotiator — no double-ownership. |

---

## Finance (secondary evidence-consumer, no reel)

Approval and audit events emitted by flows 02 and 08 are consumable by the finance function for CPS 234 §36 audit-ready evidence. Finance appears INSIDE these flows as a downstream beneficiary — it does not own a reel.
