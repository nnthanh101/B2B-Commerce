---
title: "Flow 08: Order Editing"
description: Admin edits a post-checkout order — adds/removes line items, adjusts quantity.
sidebar_position: 9
tags: [demo, flow, order-edit, admin]
source_refs:
  - path: "docs/demo/flows/08-order-edit.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Flow 08: Order Editing

**Persona**: Priya (Sales Manager)

**Scenario**: Maria places order #QT-2026-1847 for 100 units of cables. Two hours later, she emails Priya asking to add 50 more units and remove the power adapters. Instead of waiting for a credit memo and a new order, Priya opens the order in the admin UI, edits the line items (remove 10 adapters, add 50 cables), and saves. The order recalculates. Audit log records the change. Maria sees it instantly in her account.

**Status**: ⚠️ **EXCLUDED** — Storefront /account/orders route renders Forbidden; backend order-edit API is green; visual layer blocked

**Duration**: ~2 min

![Orders list page in admin console](pathname:///img/demo/flows/08-order-edit/generated-order-edit-01-orders-page.png)

![Orders wrapper container](pathname:///img/demo/flows/08-order-edit/generated-order-edit-02-orders-wrapper.png)

![Orders page heading](pathname:///img/demo/flows/08-order-edit/generated-order-edit-03-orders-heading.png)

![Empty orders state](pathname:///img/demo/flows/08-order-edit/generated-order-edit-04-empty-orders.png)

<video controls preload="metadata" style={{maxWidth:'800px'}} src="/video/demo/flows/08-order-edit.mp4"></video>

## Script (voice narration — partial, backend-only)

**[00:08]** "Order Editing lets admins adjust post-purchase line items without reissuing invoices."

**[00:16]** "Priya opens order QT-2026-1847 in the admin console: 100 cables, 10 adapters, $1,850 total."

**[00:24]** "She removes 10 adapters and adds 50 more cables. Order recalculates: $2,100 new total."

**[00:31]** "Priya saves. The audit log records: 'Edited by Priya, added 50 cables, removed adapters.'"

**[00:39]** "Backend order-edit API is complete; storefront /account/orders view is in next phase."
