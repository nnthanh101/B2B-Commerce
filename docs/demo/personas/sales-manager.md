# Sales Manager Persona — Sofia

> SELLER-SIDE negotiator. Owns 1 flow (05). Distinct from the customer-side admin.

---

## Role

Sofia is an OceanSoft internal sales representative and customer-success manager — the seller-side gatekeeper who negotiates price and terms in-platform with a full message history and a clean approval handoff.

---

## Goal / JTBD

> "When a customer requests a quote or sends a counter-offer, I want to negotiate price and terms in-platform with a full message history and a clean approval handoff, so I can close the deal faster with an immutable record instead of scattered emails."

---

## Top-3 Pains and Gains

| # | Pain (before) | Gain (after) |
|---|---------------|--------------|
| 1 | Deal context is scattered across email threads; no single history both parties see | In-platform quote negotiation with a full message trail visible to both buyer and seller — zero lost context (flow 05) |
| 2 | Hard to know which deals are ready to close versus still in negotiation | Auditable status transitions and approval handoff mark each deal's state explicitly — Sofia always knows next action (flow 05) |
| 3 | Manual pricing updates lag and introduce errors; counter-offers are informal and untracked | Counter-offers (price, terms, delivery) sent directly in the platform, recorded immutably — no email-to-spreadsheet transcription (flow 05) |

---

## Success Metric

**Approval SLA met and immutable negotiation record maintained (0 lost-context handoffs)**

Measured by: flow 05 E2E test — Sofia sends a counter-offer; buyer sees it; status transitions are asserted in sequence; full message trail present in the final state (test-side assertion in the E2E suite).

---

## Flow Ownership (Sofia owns 1 of 11)

| Flow | Title | Sofia's goal for this reel |
|------|-------|---------------------------|
| 05 | Quote Negotiation | Counter price and terms in-platform with a full message trail both sides see — faster close, immutable record |

**Participant (not owner):** Flow 02 (approval) — Sofia is the seller awaiting the deal to clear once David (admin) approves; David owns the approve-action and the reel. This distinction prevents double-ownership: 02 owner = admin; 05 owner = sales-manager.

---

## 5W1H

| Dimension | Answer |
|-----------|--------|
| **Why** | Two-sided B2B (buyer org plus seller org) needs the seller voice — without Sofia, the quote-negotiate reel (05) has no goal-owner and regresses to a feature tour |
| **What if missing** | Flow 05 narration has no persona lens; the negotiation feature cannot be voiced as a buyable outcome |
| **Business value** | Faster close plus immutable record = revenue velocity for OceanSoft plus audit defensibility for the customer — both sides benefit |
| **Purpose** | Open flow 05 with Sofia's close-the-deal goal; make seller-side negotiation feel like a product outcome, not a chat widget |
| **Critical thinking** | Stub overlap resolved: admin = customer-side approver (owns 02); sales-manager = seller-side negotiator (owns 05). Sofia does NOT own flow 02 — she participates as the seller awaiting deal clearance. One reel, one owner, no contradiction. |
