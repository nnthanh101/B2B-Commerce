---
reel: cfo-governed-spend
title: "CFO — Governed Spend: Control Before the Money Moves"
description: "CFO-lens reel: spending limits enforced at the cart, approval #2469 on the record — governed spend before money moves, NZD throughout."
tags: [demo, reel, cfo, governed-spend, approval, finance]
source_refs:
  - path: "docs/static/video/demo/flows/cfo-governed-spend.mp4"
    last_compiled: "2026-06-09"
  - path: "docs/static/img/demo/flows/cfo-governed-spend/"
    last_compiled: "2026-06-09"
last_compiled: "2026-06-09T00:00:00Z"
persona_primary: David (Approving Manager) + Maria (Procurement Specialist)
persona_secondary: Finance (evidence-consumer)
flows: [04-spending-limit, 03-company-mgmt, approval-audit]
voice: Daniel
ground_truth: "employee limit NZ$200 · cart NZ$520 (2× Wireless Mouse) · approval #2469 · Demo Corp NZD"
frames:
  beat1: docs/static/img/demo/flows/cfo-governed-spend/step-01.png
  beat2: docs/static/img/demo/flows/cfo-governed-spend/step-02.png
  beat3: docs/static/img/demo/flows/cfo-governed-spend/step-03.png
  beat4: docs/static/img/demo/flows/cfo-governed-spend/step-04.png
  beat5: docs/static/img/demo/flows/cfo-governed-spend/step-05.png
  beat6: docs/static/img/demo/flows/cfo-governed-spend/step-06.png
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# CFO — Governed Spend

**Headline (why a CFO cares):** spend is governed *before* money moves — every limit enforced at the cart, every approval on the record. No rogue POs, no clawbacks, a clean audit trail.

**Arc:** control configured up front → limit enforced at cart → blocked before spend → routed to the right approver → deliberate approval → on the record.

**Numbers are truthful to the live render** (orchestrator-verified): Maria's per-employee limit is **NZ$200**, the cart is **NZ$520** (2× Wireless Mouse), approval **#2469**, Demo Corp (NZD). No NZ$2,000 ceiling is shown because the live admin renders the per-employee limit — narrate NZ$200, never a fabricated figure.

<video controls preload="metadata" style={{maxWidth:'800px'}} src={useBaseUrl('/video/demo/flows/cfo-governed-spend.mp4')}></video>

<img src={useBaseUrl('/img/demo/flows/cfo-governed-spend/step-01.png')} alt="Cart NZ$520 exceeds Maria's NZ$200 limit — over-limit warning at the cart" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/cfo-governed-spend/step-03.png')} alt="Checkout blocked at the cart; Maria routed to request approval" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/cfo-governed-spend/step-06.png')} alt="Approval #2469 marked Approved — governed spend on the record" style={{maxWidth:'800px'}} />

## Why this matters — CFO lens

**Why**: A CFO's core fear is spend that escapes policy — a rogue purchase order that surfaces only after the money is gone. This reel shows Maria's NZ$520 cart caught against her NZ$200 limit *at the cart*, before checkout.

**Business value**: Every limit is enforced before money moves and every decision is on the record — the reel shows the over-limit block, the routed approval #2469, and the final Approved status. That is a clean, traceable audit trail for Demo Corp in NZD.

**What-if-missing**: Without cart-level enforcement, the NZ$520 order clears unchecked and the control becomes a post-hoc clawback — the exact uncontrolled-spend and missing-audit-trail risk a CFO is accountable for.

---

**[00:00]** "Governed spend starts before anyone shops. David, the approving manager at Demo Corp, gives each employee a hard limit — Maria's is two hundred New Zealand dollars. The control is in place before the first order is ever placed."

**[00:09]** "Maria, in procurement, fills her cart — two units, five hundred and twenty dollars. That is over her two-hundred-dollar limit, and the platform catches it the moment she opens the cart: this order exceeds your spending limit."

**[00:19]** "Checkout is blocked right here at the cart — not after the money has moved. The spend is stopped before it happens, and Maria is routed to request approval. No rogue purchase order, no awkward clawback later."

**[00:29]** "On the admin side, David sees approval number 2469 land in his queue — Demo Corp, one item, awaiting his decision. The request routed straight to the right approver, with no email chain."

**[00:38]** "He reviews and approves in a single, deliberate action — the platform confirms it cannot be undone. The decision is intentional, and it is captured."

**[00:47]** "Status flips to Approved. Every dollar is governed, every approval is on the record — the clean audit trail a CFO, and Finance, can actually trust."
