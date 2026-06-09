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

**Scenario**: Maria places order #47 for 2× Wireless Keyboard at NZ$318.00. Priya opens it in the admin UI, edits the quantity, and saves. The order recalculates instantly. Audit log records the change. Maria sees it in her account without any email back-and-forth.

**Status**: ✅ GREEN

**Duration**: ~2 min

import useBaseUrl from '@docusaurus/useBaseUrl';

<video
  src={useBaseUrl('/video/demo/flows/flow-08-order-edit.mp4')}
  controls
  autoPlay={false}
  style={{ width: '100%', maxWidth: '960px', borderRadius: '8px', marginBottom: '1.5rem' }}
/>

## Script (voice narration — partial, backend-only)

**[00:08]** "Order Editing lets admins adjust post-purchase line items without reissuing invoices."

**[00:16]** "Priya opens order QT-2026-1847 in the admin console: 100 cables, 10 adapters, $1,850 total."

**[00:24]** "She removes 10 adapters and adds 50 more cables. Order recalculates: $2,100 new total."

**[00:31]** "Priya saves. The audit log records: 'Edited by Priya, added 50 cables, removed adapters.'"

**[00:39]** "Backend order-edit API is complete; storefront /account/orders view is in next phase."
