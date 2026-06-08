---
title: "Flow 01: Cart to Quote"
description: Buyer adds items to cart and submits a quote request.
sidebar_position: 2
tags: [demo, flow, cart, quote, buyer]
source_refs:
  - path: "docs/demo/flows/01-cart-to-quote.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Flow 01: Cart to Quote

**Persona**: Maria (Buyer-Employee)

**Scenario**: Maria has loaded a shopping cart with 12 office accessories over the week. The budget quarter closes in 4 days. Rather than waiting for a quote-by-email (3–5 days) and three levels of approval, she converts the cart to an approval request and submits it in 90 seconds. The system assigns a quote ID and routes it to her manager's dashboard instantly.

**Status**: ✅ GREEN

**Duration**: ~2 min

![Shopping cart ready to quote](pathname:///img/demo/flows/01-cart-to-quote/generated-ctq-01-cart-page.png)

![Cart with items added](pathname:///img/demo/flows/01-cart-to-quote/generated-ctq-02-cart-with-items.png)

![Quote request modal](pathname:///img/demo/flows/01-cart-to-quote/generated-ctq-03-quote-modal.png)

![Quote submitted confirmation](pathname:///img/demo/flows/01-cart-to-quote/generated-ctq-04-submitted.png)

![Quote details page](pathname:///img/demo/flows/01-cart-to-quote/generated-ctq-05-quote-details.png)

<video controls preload="metadata" style={{maxWidth:'800px'}} src="/video/demo/flows/01-cart-to-quote.mp4"></video>

## Script (voice narration)

**[00:06]** "Cart to Quote skips email approval delays — one click turns a cart into a formal quote request."

**[00:15]** "Maria navigates to her cart and reviews the items: office supplies, cables, adapters totaling $850 NZD."

**[00:25]** "She clicks Request Quote at the bottom. The system generates a unique quote ID and shows the quote summary."

**[00:35]** "Her manager David receives the quote notification instantly — he can approve or reject with a comment."

**[00:44]** "The quote status displays live: Pending Approval. Maria knows exactly where her request stands."

**[00:53]** "Budget quarter protected. Quote filed. Decision cycle: one session, not three days."

## Cross-References

- [Persona: Maria (Buyer-Employee)](../personas/buyer.md) — full persona playbook
- [Demo Narration Script](../narration.md) — timestamped voice-over for all flows
- [Demo Scripts — Narration Cue Sheet](../scripts.md) — consolidated cue sheet for recording
- [Entity: Quote Module](../../modules/quote-module.md) — backend module that powers the quote request in this flow
- [Entity: Company Module](../../modules/company-module.md) — company context (spending limits, employee roles) that governs this flow
- [Entity: Approval Module](../../modules/approval-module.md) — approval gate triggered when this quote is submitted
