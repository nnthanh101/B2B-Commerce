# Buyer-Employee Persona — Maria

> PRIMARY end-user. Owns the most flows (6 of 11). Every B2B value moment begins here.

---

## Role

Maria is a procurement officer and field-engineering lead at a customer company — the front-line buyer who triggers every B2B value moment on the platform.

---

## Goal / JTBD

> "When I need to buy regulated or large-value equipment for my team, I want to self-serve the request and get a quote/approval without a 3-day email sign-off chain, so I can keep field work moving while staying inside company policy."

---

## Top-3 Pains and Gains

| # | Pain (before) | Gain (after) |
|---|---------------|--------------|
| 1 | Cannot self-serve regulated or large purchases — waits on email sign-off chain | One-click Request Quote routes for approval automatically; chain collapses from days to minutes (flow 01) |
| 2 | No real-time view of remaining budget; risks an embarrassing over-spend at checkout | Live spending-limit shown at cart; system blocks or flags over-policy before submit — policy breach impossible (flow 04) |
| 3 | Bulk re-orders and SKU lookups are slow and error-prone; re-keying wastes field time | Bulk-add from list plus quick-order-pad re-order in seconds from a single pad (flows 09, 10) |

---

## Success Metric

**Quote-request cycle time: days (email sign-off) → minutes (in-app request-to-approval)**

Measured by: timestamp delta between quote request submission and approval status update in flows 01 and 02 (narration evidence plus status-transition assertion in the E2E suite).

---

## Flow Ownership (Maria owns 6 of 11)

| Flow | Title | Maria's goal for this reel |
|------|-------|---------------------------|
| 01 | Cart to Quote | Skip the 3-day email sign-off — request a quote in minutes |
| 04 | Spending Limit Enforcement | See live remaining budget; system blocks over-policy before I even submit |
| 06 | Promotions | Watch bulk and time-based discounts auto-apply — savings are visible at the cart |
| 07 | Full E-Commerce | Browse, add, and check out end-to-end — the B2B storefront is a real store |
| 09 | Bulk Add to Cart | Import a multi-item field list into the cart in seconds |
| 10 | Quick Order Pad | Re-order known SKUs from a fast entry pad without digging through the catalog |

**Participant (not owner):** Flow 05 (quote negotiation) — Maria submits the quote; Sofia (sales-manager) owns the seller-side negotiation reel.

---

## 5W1H

| Dimension | Answer |
|-----------|--------|
| **Why** | Buyer-employee is the user who TRIGGERS value; hiding her behind admin or sales-manager produces INVISIBLE_PRIMARY_USER and GTM collapse on first demo |
| **What if missing** | Reels become a feature tour ("click Request Quote") instead of a buyable outcome ("Maria skips a 3-day sign-off") — trust loss with alpha customers |
| **Business value** | Every owned reel is a buyable outcome: days-to-minutes self-serve procurement for field teams; directly reduces procurement cycle drag |
| **Purpose** | Make the buyer's goal the first spoken line of 6 of the 11 reels; the lens through which every B2B capability is judged |
| **Critical thinking** | Maria owns the most flows BY DESIGN (primacy); but only Phase-2-green flows count — owned set is pruned to flow-green-verdict PASS before any reel is built |

---

## Finance (secondary evidence-consumer, no reel)

When flows 02 and 08 emit approval and audit-trail events, the finance function consumes FOCUS-tagged spend and the approval record for CPS 234 §36 audit-ready evidence — without a separate reel (build-for-current-scale: 0 paying customers, no aspirational finance narrator).
