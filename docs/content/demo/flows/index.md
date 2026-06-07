---
title: Demo Flows
description: Index of 11 B2B-Commerce demo flow playbooks.
sidebar_position: 1
tags: [demo, flows, index]
source_refs:
  - path: "docs/demo/flows/"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Demo Flows

11 individual flow playbooks for the B2B-Commerce demo. Each flow maps to a Playwright spec in `tests/e2e/`.

| Flow | Title | Primary Persona |
|------|-------|----------------|
| [01](./01-cart-to-quote.md) | Cart to Quote | Buyer |
| [02](./02-approval.md) | Approval Workflow | Admin / Sales Manager |
| [03](./03-company-mgmt.md) | Company Management | Admin |
| [04](./04-spending-limit.md) | Spending Limit Enforcement | Buyer / Admin |
| [05](./05-quote-negotiate.md) | Quote Negotiation | Sales Manager |
| [06](./06-promotions.md) | Promotions | Buyer |
| [07](./07-full-ecommerce.md) | Full E-Commerce Flow | Buyer |
| [08](./08-order-edit.md) | Order Editing | Admin |
| [09](./09-bulk-add.md) | Bulk Add to Cart | Buyer |
| [10](./10-quick-order-pad.md) | Quick Order Pad | Buyer |
| [11](./11-invite-employee.md) | Invite Employee | Admin |

Run `/commerce:docs-ingest docs/demo/flows/` to compile all flows into full playbooks.
