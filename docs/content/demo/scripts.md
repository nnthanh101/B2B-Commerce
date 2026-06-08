---
title: "Demo Scripts — Narration Cue Sheet"
description: Consolidated voice narration cues for all 11 B2B demo flows. Use this guide to record your voiceover and sync with auto-generated MP4s.
sidebar_position: 1
tags: [demo, scripts, narration, voice-recording]
source_refs:
  - path: "docs/demo/flows/"
    last_compiled: "2026-06-07"
  - path: "scripts/batch-demo-video.sh"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Demo Scripts — Narration Cue Sheet

This file is your **HITL voice recording guide** for all 11 B2B-Commerce demo flows. Each flow lists the exact narration cues with timestamps `[MM:SS]`, so you can record your voice and sync it with the auto-generated MP4 video using `ffmpeg`.

---

<details>
<summary>Flow 01 — Cart to Quote</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria converts a shopping cart into an approval-ready quote in 90 seconds instead of waiting 3–5 days for email approval.

**[00:06]** "Cart to Quote skips email approval delays — one click turns a cart into a formal quote request."

**[00:15]** "Maria navigates to her cart and reviews the items: office supplies, cables, adapters totaling $850 NZD."

**[00:25]** "She clicks Request Quote at the bottom. The system generates a unique quote ID and shows the quote summary."

**[00:35]** "Her manager David receives the quote notification instantly — he can approve or reject with a comment."

**[00:44]** "The quote status displays live: Pending Approval. Maria knows exactly where her request stands."

**[00:53]** "Budget quarter protected. Quote filed. Decision cycle: one session, not three days."

</details>

---

<details>
<summary>Flow 02 — Approval Workflow</summary>

**Persona**: David (Admin)

**Business outcome**: David approves or rejects a quote with a comment and an audit trail in one click — buyer is notified instantly, every decision is on record.

**[00:08]** "Approval Workflow gives admins full audit trails for every quote decision."

**[00:17]** "David opens the pending quote and sees the 12 items, total $850 NZD, and Maria's notes."

**[00:26]** "He types a comment — 'Approved. Within Q4 office supplies budget.' — then clicks Approve."

**[00:34]** "Maria gets an instant notification: Quote Approved. She can now proceed to checkout."

**[00:43]** "David's audit log shows: Approved by David, 14-Jun-2026 10:34am, comment recorded."

**[00:51]** "No email chains. No ambiguity. Every decision on record."

</details>

---

<details>
<summary>Flow 03 — Company Management</summary>

**Persona**: David (Admin)

**Business outcome**: David governs members, roles, and limits from one company console — full team control without a support ticket.

**[00:07]** "Company Management lets admins control team, roles, and spending limits from one console."

**[00:16]** "David navigates to Company Settings and clicks Add Employee."

**[00:24]** "He enters Sarah's email, sets her role to Employee, and her monthly spending limit to $2,000 NZD."

**[00:33]** "He clicks Save. The system generates an invite token and displays a copy link."

**[00:41]** "Sarah accepts the invite, sets a password, and joins the company instantly — no support ticket needed."

**[00:50]** "David can now see Sarah in the team roster with her role and spending limit visible."

</details>

---

<details>
<summary>Flow 04 — Spending Limit Enforcement</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria sees live remaining budget at the cart — the system blocks over-policy before she even submits.

**[00:05]** "Spending Limit Enforcement blocks over-policy purchases before submission."

**[00:14]** "Maria browses products and adds items to her cart. Her remaining budget: $200 NZD."

**[00:23]** "She adds a $400 item. The cart shows a warning: 'Remaining: $200. This item exceeds limit.'"

**[00:32]** "The item is disabled. Maria can see the overage amount and exact policy constraint."

**[00:40]** "She removes the item and adds a $150 item instead. Total now $2,950. Within limit. Checkout enabled."

**[00:48]** "No surprises. No rejections at approval. Policy enforced at the moment of decision."

</details>

---

<details>
<summary>Flow 05 — Quote Negotiation</summary>

**Persona**: Priya (Sales Manager)

**Business outcome**: Priya counters a buyer's quote with revised pricing inside the platform, closing the negotiation in one session.

**Status**: ⚠️ **EXCLUDED** — Admin quotes page route issue; feature code-complete, visual layer blocked

**[00:08]** "Quote Negotiation lets sales managers counter-offer and track all messages in one thread."

**[00:16]** "Priya receives Maria's quote for 500 units at $30 each."

**[00:23]** "She clicks Counter Offer and proposes a 15% volume discount: $25.50 per unit."

**[00:31]** "Maria sees the counter and accepts it instantly — visual confirmation blocked pending route fix."

**[00:38]** "Backend negotiation flow is green; storefront route and messaging UI are in the next phase."

</details>

---

<details>
<summary>Flow 06 — Promotions</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria watches bulk and time-based discounts auto-apply — savings are visible at the cart before checkout.

**[00:06]** "Promotions auto-apply bulk discounts — savings visible instantly at the cart."

**[00:15]** "Maria adds 120 units of office supplies. Subtotal: $1,500 NZD."

**[00:24]** "The cart recalculates automatically and shows: Bulk Discount (10%) applied. New total: $1,350."

**[00:32]** "Maria sees her savings: $150 NZD. No code to enter. No negotiation needed."

**[00:40]** "She reviews the promotion details — valid until 30-Jun-2026 — and checks out."

**[00:48]** "Transparent pricing. Instant rewards. Buyers close faster."

</details>

---

<details>
<summary>Flow 07 — Full Ecommerce</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria browses, adds, and checks out end-to-end — the B2B storefront is a real store, not a mockup.

**[00:06]** "Full Ecommerce is a real B2B storefront — not a mockup or quote engine."

**[00:14]** "Maria logs in and navigates to Office Supplies. 47 products, sortable by price."

**[00:23]** "She clicks a product: USB-C Cables. Pricing shows in NZD. She adds 5 to cart."

**[00:31]** "The cart updates live. Her spending limit is visible: Remaining $1,200 NZD."

**[00:39]** "She adds two more items, then clicks Checkout. Order confirmed in seconds."

**[00:47]** "Maria has order #QT-2026-1847. The B2B store is fully operational."

</details>

---

<details>
<summary>Flow 08 — Order Editing</summary>

**Persona**: Priya (Sales Manager)

**Business outcome**: Priya adjusts a submitted order's line items post-placement — changes tracked with full audit trail.

**Status**: ⚠️ **EXCLUDED** — Storefront /account/orders route renders Forbidden; backend order-edit API is green, visual layer blocked

**[00:08]** "Order Editing lets admins adjust post-purchase line items without reissuing invoices."

**[00:16]** "Priya opens order QT-2026-1847 in the admin console: 100 cables, 10 adapters, $1,850 total."

**[00:24]** "She removes 10 adapters and adds 50 more cables. Order recalculates: $2,100 new total."

**[00:31]** "Priya saves. The audit log records: 'Edited by Priya, added 50 cables, removed adapters.'"

**[00:39]** "Backend order-edit API is complete; storefront /account/orders view is in next phase."

</details>

---

<details>
<summary>Flow 09 — Bulk Add to Cart</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria imports a multi-item field list into the cart in seconds — no re-keying, no copy-paste errors.

**[00:05]** "Bulk Add imports multi-line SKU lists in seconds — no re-keying, no copy-paste errors."

**[00:14]** "Maria opens the Bulk Order Pad and pastes her quarterly SKU list: 18 items with quantities."

**[00:23]** "The system resolves each SKU, shows unit prices in NZD, calculates totals, and previews the cart."

**[00:31]** "She clicks Add to Cart. All 18 items load in seconds. Cart total: $3,450 NZD."

**[00:39]** "Maria can now quote or checkout — no manual re-keying, no errors to fix."

**[00:47]** "Bulk ordering is fast. Accuracy is guaranteed. Procurement simplified."

</details>

---

<details>
<summary>Flow 10 — Quick Order Pad</summary>

**Persona**: Maria (Buyer-Employee)

**Business outcome**: Maria re-orders known SKUs from a fast entry pad without digging through the catalog.

**[00:06]** "Quick Order Pad is the fast lane for repeat orders — familiar SKUs, one-click entry."

**[00:15]** "Maria opens Quick Order Pad. Her top 5 recent SKUs are pre-populated in entry rows."

**[00:24]** "She updates quantities: 5, 10, 2 for her biweekly office order. Prices show in NZD."

**[00:32]** "Cart preview updates live: $650 total. Remaining budget: $1,200. Within limit."

**[00:40]** "Maria clicks Order. The cart is ready to quote or checkout in 30 seconds."

**[00:48]** "Repeat ordering. Zero friction. Procurement on autopilot."

</details>

---

<details>
<summary>Flow 11 — Invite Employee</summary>

**Persona**: David (Admin)

**Business outcome**: David generates and tracks an invite — the employee accepts via token; email delivery is deferred, this reel voices the green token-accept slice only.

**Status**: 🟡 **PARTIAL** — Token-accept flow is green; SES integration pending (GAP-006)

**[00:09]** "Invite Employee lets admins enroll new team members without manual user creation."

**[00:17]** "David navigates to the company Employees page and clicks Invite New Member."

**[00:26]** "He enters Sarah's email and sets her spending limit to $2,000 NZD, then clicks Send Invite."

**[00:34]** "The system generates a unique invite token. Sarah opens the Accept Invite page, sets a password."

**[00:42]** "She clicks Accept Invite. Her account is created and linked to the company — Ready."

**[00:52]** "Token-accept flow is complete and green. Email delivery (SES) is in progress."

</details>

---

## How to Combine Your Audio with the MP4

Once you've recorded your voiceover as an audio file (e.g., `my-recording.m4a`), use the command below to sync your voice with the auto-generated video and create the final MP4:

```bash
# For each flow, replace NN with the flow number (01-11) and NAME with the flow slug
# Example: Flow 01 (Cart to Quote) → NN=01, NAME=cart-to-quote

ffmpeg -i docs/demo/flows/NN-name.mp4 \
  -i your-recording.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac \
  -shortest \
  docs/demo/flows/NN-name-combined.mp4
```

### Concrete Examples

**Flow 01 (Cart to Quote):**
```bash
ffmpeg -i docs/demo/flows/01-cart-to-quote.mp4 \
  -i my-recording.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac \
  -shortest \
  docs/demo/flows/01-cart-to-quote-combined.mp4
```

**Flow 07 (Full Ecommerce):**
```bash
ffmpeg -i docs/demo/flows/07-full-ecommerce.mp4 \
  -i my-recording.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac \
  -shortest \
  docs/demo/flows/07-full-ecommerce-combined.mp4
```

### What the ffmpeg Command Does

| Flag | Purpose |
|------|---------|
| `-i docs/demo/flows/NN-name.mp4` | Input video file (auto-generated) |
| `-i your-recording.m4a` | Input audio file (your voiceover) |
| `-map 0:v` | Use video stream from the first input (the MP4) |
| `-map 1:a` | Use audio stream from the second input (your recording) |
| `-c:v copy` | Copy video codec without re-encoding (faster) |
| `-c:a aac` | Encode audio as AAC (standard MP4 audio codec) |
| `-shortest` | Stop when the shorter stream ends (video or audio) |
| Output file | `docs/demo/flows/NN-name-combined.mp4` — the final synced video |

### Tips

- **Test one flow first**: Record and combine Flow 01, verify it looks and sounds right, then batch-process the rest.
- **Audio level**: If your voice is too quiet or loud, add `-af "volume=1.5"` (for 1.5x louder) before the output filename.
- **Batch processing**: For all 11 flows, wrap the ffmpeg command in a bash loop and save as `combine-audio.sh`.

---

**Document compiled**: 2026-06-07  
**All 11 flows included**: 9 GREEN + 2 EXCLUDED status documented  
**Ready for HITL voice recording**: Use timestamps and narration above to record your voiceover.
