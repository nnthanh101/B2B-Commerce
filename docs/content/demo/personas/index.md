---
title: "Index: B2B-Commerce Personas"
description: Reference personas for B2B-Commerce — buyer-employee, admin, sales manager, and operator. Each persona playbook maps use cases, permissions, and workflows.
tags: [demo, personas, roles, workflows]
source_refs:
  - path: "docs/demo/personas/"
    last_compiled: "2026-06-09"
last_compiled: "2026-06-09T00:00:00Z"
---

# Index: B2B-Commerce Personas

Four user personas drive the B2B-Commerce demo flows and narrative. Each persona embodies a distinct role within a company account, with specific permissions, workflows, and business value.

| Persona | Page | Role & Responsibilities |
|---------|------|------------------------|
| **Buyer** | [Personas: Buyer](./buyer.md) | Employee placing orders within company spending limits; uses quick-order pad, cart checkout, and quote request workflow |
| **Admin** | [Personas: Admin](./admin.md) | Company account manager; configures spending limits, approval rules, and employee group membership |
| **Sales Manager** | [Personas: Sales Manager](./sales-manager.md) | Internal sales team member; negotiates quote counter-offers, manages message threads, and finalizes deals |
| **Operator** | [Personas: Operator](./operator.md) | Platform operator (OceanSoft or licensee); deploys locally in Docker, seeds demo data, and validates E2E flows |

## Permission Matrix

```
Buyer           → place order (within limit), request quote
Admin           → manage company, set limits, configure approvals
Sales Manager   → negotiate quotes, counter-offer, accept/reject
Operator        → full platform access (local/staging/production)
```

## Narrative Flow Map

See [Persona Flow Map](../persona-flow-map.md) for the machine-readable flow ownership matrix, and [Demo Flows](../flows/index.md) for the 11 individual flow playbooks.
