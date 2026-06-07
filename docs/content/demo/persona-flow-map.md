---
title: Persona Flow Map
description: Machine-readable persona-to-flow ownership contract for demo batch recording.
sidebar_position: 3
tags: [demo, personas, flows, machine-readable]
source_refs:
  - path: "docs/demo/persona-flow-map.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Persona-Flow Map — B2B-Commerce B2B Demo

Machine-readable persona-to-flow ownership contract for `scripts/batch-demo-video.sh`.

## Flow Ownership Table

| Flow ID | Title | Persona | Opening Goal | Status |
|---------|-------|---------|--------------|--------|
| 01 | Cart to Quote | Maria (Buyer-Employee) | Maria skips the 3-day email sign-off — one click turns a cart into an approval-ready quote in minutes, not days | ✅ GREEN |
| 02 | Approval Workflow | David (Admin) | David approves or rejects a quote with a comment and an audit trail in one click — buyer is notified instantly, every decision is on record | ✅ GREEN |
| 03 | Company Management | David (Admin) | David governs members, roles, and limits from one company console — full team control without a support ticket | ✅ GREEN |
| 04 | Spending Limit Enforcement | Maria (Buyer-Employee) | Maria sees live remaining budget at the cart — the system blocks over-policy before she even submits | ✅ GREEN |
| 05 | Quote Negotiation | Priya (Sales Manager) | Priya counters a buyer's quote with revised pricing inside the platform, closing the negotiation in one session | ⚠️ EXCLUDED |
| 06 | Promotions | Maria (Buyer-Employee) | Maria watches bulk and time-based discounts auto-apply — savings are visible at the cart before checkout | ✅ GREEN |
| 07 | Full Ecommerce | Maria (Buyer-Employee) | Maria browses, adds, and checks out end-to-end — the B2B storefront is a real store, not a mockup | ✅ GREEN |
| 08 | Order Editing | Priya (Sales Manager) | Priya adjusts a submitted order's line items post-placement — changes tracked with full audit trail | ⚠️ EXCLUDED |
| 09 | Bulk Add to Cart | Maria (Buyer-Employee) | Maria imports a multi-item field list into the cart in seconds — no re-keying, no copy-paste errors | ✅ GREEN |
| 10 | Quick Order Pad | Maria (Buyer-Employee) | Maria re-orders known SKUs from a fast entry pad without digging through the catalog | ✅ GREEN |
| 11 | Invite Employee | David (Admin) | David generates and tracks an invite — the employee accepts via token; email delivery is deferred (GAP-006), this reel voices the green token-accept slice only | 🟡 PARTIAL |

## Persona Summary

**Maria (Buyer-Employee)** owns 6 flows: 01, 04, 06, 07, 09, 10  
**David (Admin)** owns 3 flows: 02, 03, 11  
**Priya (Sales Manager)** owns 2 flows: 05 (excluded), 06 (shared with Maria), 08 (excluded)

---

## Machine-Readable Flow Markers (for batch-demo-video.sh)

<!-- flow:01-cart-to-quote owner:buyer-employee goal:"Maria skips the 3-day email sign-off — one click turns a cart into an approval-ready quote in minutes, not days" -->
<!-- flow:02-approval owner:admin goal:"David approves or rejects a quote with a comment and an audit trail in one click — buyer is notified instantly, every decision is on record" -->
<!-- flow:03-company-mgmt owner:admin goal:"David governs members, roles, and limits from one company console — full team control without a support ticket" -->
<!-- flow:04-spending-limit owner:buyer-employee goal:"Maria sees live remaining budget at the cart — the system blocks over-policy before she even submits" -->
<!-- flow:05-quote-negotiate owner:sales-manager goal:"Priya counters a buyer's quote with revised pricing inside the platform, closing the negotiation in one session" -->
<!-- flow:06-promotions owner:buyer-employee goal:"Maria watches bulk and time-based discounts auto-apply — savings are visible at the cart before checkout" -->
<!-- flow:07-full-ecommerce owner:buyer-employee goal:"Maria browses, adds, and checks out end-to-end — the B2B storefront is a real store, not a mockup" -->
<!-- flow:08-order-edit owner:sales-manager goal:"Priya adjusts a submitted order's line items post-placement — changes tracked with full audit trail" -->
<!-- flow:09-bulk-add owner:buyer-employee goal:"Maria imports a multi-item field list into the cart in seconds — no re-keying, no copy-paste errors" -->
<!-- flow:10-quick-order-pad owner:buyer-employee goal:"Maria re-orders known SKUs from a fast entry pad without digging through the catalog" -->
<!-- flow:11-invite-employee owner:admin goal:"David generates and tracks an invite — the employee accepts via token; email delivery is deferred (GAP-006), this reel voices the green token-accept slice only" -->
