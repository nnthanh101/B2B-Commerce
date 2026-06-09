---
title: "Persona: Buyer-Employee"
description: Buyer-employee persona playbook — the primary user who triggers every B2B workflow.
sidebar_position: 1
tags: [demo, persona, buyer, employee]
source_refs:
  - path: "docs/demo/personas/buyer.md"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
---

# Persona: Maria (Buyer-Employee)

**Role**: Procurement specialist — PRIMARY persona, densest capability surface, value-trigger for every B2B workflow.

Maria is a procurement specialist at a mid-market manufacturing company in New Zealand. She manages 30+ purchase requests per month, oversees recurring office restocks, negotiates supplier quotes, and tracks order status for her team. Her pain: the legacy email-PDF quote cycle takes 3–5 days and requires three manual approval sign-offs. By the time a quote is approved, her quarter-close window has slipped.

**What Maria cares about**: Speed to purchase (minutes, not days), live budget visibility before she hits submit, and zero re-keying for recurring SKU lists.

**What she avoids**: A 3-day email sign-off that blows her quarter-close window; an over-limit rejection she only discovers at checkout; copy-paste errors in 18-line restock spreadsheets.

**Key capability she unlocks**: One-click cart-to-quote, instant spending-limit feedback at the cart (before submission), bulk SKU import for quarterly restocks, quick repeat-order pad, auto-applied promotions, and a full self-service ecommerce experience without a support ticket.

## Finance secondary context

Finance (secondary, evidence-consumer only): receives the approval audit log and spend summary after Maria's quote is approved. Finance does NOT own any demo flow — there is no finance-driven storefront action in flows 01–11. Finance value is read-output only.

## Flow Narration Cue Table

Each row maps to a real flow file. Narration lines are outcome-framed ("Maria avoids…"), not feature-tour ("click X").

| Flow | Trigger action | Expected on-screen content | Narration line | Flow file |
|------|---------------|---------------------------|----------------|-----------|
| 01 | Maria clicks "Request Quote" from her loaded cart (12 items, $850 NZD) | Quote ID generated; status shows "Pending Approval"; manager notified instantly | "Maria avoids a 3-day email sign-off — the cart becomes an approval-ready quote in 90 seconds, and her manager sees it immediately." | [Flow 01: Cart to Quote](../flows/01-cart-to-quote.md) |
| 04 | Maria adds 2× Wireless Rechargeable Mouse ($260 total) to cart; her monthly limit is $200 | Orange banner: "This order exceeds your spending limit"; checkout button disabled | "Maria avoids a surprise rejection at approval — the system blocks the over-limit purchase before she even submits, and she sees the exact overage." | [Flow 04: Spending Limit Enforcement](../flows/04-spending-limit.md) |
| 06 | Maria adds 120 units of office supplies; Priya's bulk discount (10% off 100+ units) is active | Cart shows: Subtotal $1,500 → Bulk Discount (10%) -$150 → Total $1,350; savings visible before checkout | "Maria avoids a negotiation delay — the bulk discount auto-applies at the cart; she sees $150 in savings before she clicks checkout." | [Flow 06: Promotions](../flows/06-promotions.md) |
| 07 | Maria logs in, browses Office Supplies (47 products, NZD pricing), adds items, checks out | NZD prices on product pages; spending limit remaining ($1,200) visible in cart; order #QT-2026-1847 confirmed | "Maria avoids a catalog-only experience — this is a real B2B store where she can browse, buy, and get a tracking number in one session." | [Flow 07: Full E-Commerce Flow](../flows/07-full-ecommerce.md) |
| 09 | Maria opens Bulk Order Pad, pastes 18-line CSV (SKU, Qty) | System resolves all 18 SKUs, validates inventory, shows NZD unit prices; cart total $3,450 NZD populated in seconds | "Maria avoids 18 lines of copy-paste errors — one paste of her quarterly SKU list fills the cart with guaranteed accuracy." | [Flow 09: Bulk Add to Cart](../flows/09-bulk-add.md) |
| 10 | Maria opens Quick Order Pad; her top recent SKUs are pre-populated | 5 familiar SKUs in entry rows; she updates quantities (5, 10, 2); cart preview: $650 total, $1,200 budget remaining | "Maria avoids digging through the catalog for her biweekly restock — the pad remembers her SKUs and re-orders in 30 seconds." | [Flow 10: Quick Order Pad](../flows/10-quick-order-pad.md) |

## CEO-Reel Pilot Depth (scenario-first, flows 01→02)

> **Reel role**: Maria is the PROTAGONIST of the CEO reel — she is the person who *triggers value*. The reel is one continuous story (Cart → Quote → Approval), not a feature tour. Evidence-bound to flows 01 and 02 (both ✅ GREEN). [product:write-stories]

**JTBD (job to be done)**: "When my quarter-close window is days away, I need to turn a loaded cart into an approved purchase without waiting on a multi-day email sign-off chain — so my budget doesn't lapse and my team gets supplies on time."

**Pains → Gains** (the outcome the CEO must *feel*, not the mechanic):

| Pain (today, email-PDF cycle) | Gain (on screen, provably-green) |
|-------------------------------|----------------------------------|
| 3–5 day quote-by-email + 3 manual sign-offs; quarter-close slips | Cart → quote in ~90 seconds; manager notified instantly (Flow 01) |
| No visibility — she waits in the dark for "any update?" | Live status "Pending Approval" on her quote, then "Approved" (Flow 01 → 02) |
| Over-limit surprise discovered only at approval | Governed spend: $850 shown under-policy, NZD throughout |
| Approval leaves no record — "who signed off, when?" | Compliance-ready audit log: approver + timestamp + comment (Flow 02) |

**Success metric (measured, NOT forecast)**: decision cycle compresses from **3 days → minutes** for a single quote, demonstrated on screen by the quote-created state → approved state within the reel; spend stays governed (under-limit, NZD-denominated). [product:north-star]

**5W1H (Maria)**:
- **Who**: Maria, procurement specialist, mid-market NZ manufacturer; the value-trigger.
- **What**: Convert a 12-item, $850 NZD cart into an approval-ready quote and watch it get approved.
- **When**: Quarter-close minus 4 days — time pressure is the tension.
- **Where**: Storefront cart → quote-detail page (Flow 01 screens 01-cart → 05-quote-details).
- **Why**: A 3-day email sign-off blows the quarter-close window; minutes-to-approval protects the budget.
- **How**: One "Request Quote" click generates a quote ID, routes to David's dashboard, status goes live.

**Flows/screens this persona drives in the pilot**: Flow 01 (cart-page → cart-with-items → quote-modal → submitted → quote-details), handing off to David at Flow 02.

## Cross-References

- [Persona Flow Map](../persona-flow-map.md) — machine-readable flow ownership contract
- [Demo Storyboard](../storyboard.md) — 3-Act scene breakdown (Buy → Run → Adopt)
- [Feature Walkthrough Narration](../feature-walkthrough-narration.md) — extended narration for all 11 flows
- [Demo Scripts](../scripts.md) — consolidated voice narration cue sheet
