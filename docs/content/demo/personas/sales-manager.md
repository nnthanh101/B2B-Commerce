---
title: "Persona: Sales Manager"
description: Sales manager persona playbook — quote negotiation, spending limit enforcement, approval.
sidebar_position: 3
tags: [demo, persona, sales-manager, quote, approval]
source_refs:
  - path: "docs/demo/personas/sales-manager.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Persona: Priya (Sales Manager)

**Role**: Sales operations manager — quote negotiation, order editing, and bulk discount configuration.

Priya is a sales operations manager at B2B software vendor (OceanSoft). She handles 20+ quote negotiations per week, counters buyer pricing with custom volume discounts, and tracks deal approvals across the pipeline. Her pain: negotiation happens across email, Slack, and spreadsheets — there is no single source of truth, deals slip between channels, and post-order corrections require re-issuing invoices.

**What Priya cares about**: One-platform negotiation (counter quotes, track messages, see approval status instantly), discount automation (bulk and time-based offers auto-apply without manual intervention), and post-order edit capability (adjust line items without reissuing invoices).

**What she avoids**: A 20-email negotiation thread with no audit trail; manually re-issuing an invoice every time a buyer changes quantities after checkout; setting up a bulk discount only to discover it requires a buyer to enter a code.

**Key capability she unlocks**: In-app quote counter-offer with message threads (Flow 05, currently excluded pending route fix); bulk discount auto-application configured once and applied transparently at the buyer's cart (Flow 06); post-order line-item editing with full audit trail (Flow 08, backend complete).

## Flow Narration Cue Table

Each row maps to a real flow file. Status is noted where a flow is excluded or partial.

| Flow | Trigger action | Expected on-screen content | Narration line | Flow file |
|------|---------------|---------------------------|----------------|-----------|
| 05 | Priya receives Maria's quote for 500 units at $30 each; clicks Counter Offer; enters 15% volume discount ($25.50/unit) | Counter shown in message thread; new total $12,750 vs $15,000; Maria sees counter and can accept (visual layer blocked pending route fix) | "Priya avoids a 20-email negotiation — she counters in one message inside the platform; deal closes in two messages, not two weeks." _(Status: backend green; storefront route excluded)_ | [Flow 05: Quote Negotiation](../flows/05-quote-negotiate.md) |
| 06 | Priya configures bulk discount (10% off orders over 100 units, valid until month-end); Maria adds 120 units | Auto-apply at Maria's cart: Subtotal $1,500 → Bulk Discount (10%) -$150 → Total $1,350; no code required | "Priya avoids manual discount administration — she configures the rule once; every qualifying buyer cart applies it automatically." | [Flow 06: Promotions](../flows/06-promotions.md) |
| 08 | Priya opens order QT-2026-1847 in admin; removes 10 adapters; adds 50 cables; saves | Order recalculates: $2,100 new total; audit log: "Edited by Priya, added 50 cables, removed adapters" (backend complete; storefront /account/orders view excluded) | "Priya avoids re-issuing an invoice — she edits the line items directly; the audit log tracks every change." _(Status: backend green; storefront route excluded)_ | [Flow 08: Order Editing](../flows/08-order-edit.md) |

## Cross-References

- [Persona Flow Map](../persona-flow-map.md) — machine-readable flow ownership contract
- [Demo Storyboard](../storyboard.md) — 3-Act scene breakdown
