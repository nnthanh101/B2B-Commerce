---
title: "Index: B2B Backend Modules"
description: Directory of all compiled Entity pages for the B2B Medusa v2 backend modules — use this to navigate to the module you need without reading raw TypeScript.
tags: [b2b, modules, index, medusa-v2]
source_refs:
  - path: "apps/backend/src/modules"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T10:00:00Z"
---

# Index: B2B Backend Modules

The three custom B2B modules live under `apps/backend/src/modules/`. Each is a self-contained Medusa v2 module with models, migrations, and a service. They are NOT upstream packages — they are first-party code owned by this repo (see [ADR-008](../architecture/adrs/ADR-008-medusa-modules-reuse-vs-new.md) and [ADR-009](../architecture/adrs/ADR-009-apps-as-first-party-not-upstream.md)).

| Page | Module Key | Responsibility |
|------|-----------|----------------|
| [Entity: Company Module](./company-module.md) | `company` | B2B company accounts + employees with spending limits |
| [Entity: Quote Module](./quote-module.md) | `quote` | Price-negotiation state machine + message thread |
| [Entity: Approval Module](./approval-module.md) | `approval` | Per-company purchase-approval gates (admin + sales-manager roles) |

## Module Dependency Map

```mermaid
graph LR
    Company["Company Module\n(company)"] -->|"company_id in\nApprovalSettings"| Approval["Approval Module\n(approval)"]
    Company -->|"employee initiates"| Quote["Quote Module\n(quote)"]
    Quote -->|"quote → order\nrequires approvals"| Approval
    Approval -->|"hasPendingApprovals guard"| MedusaCheckout["Medusa Core\n(completeCart)"]
    Quote -->|"draft_order_id\norder_change_id"| MedusaOrders["Medusa Core\n(Orders)"]
```

## Container Keys

```typescript
container.resolve("company")   // CompanyModuleService
container.resolve("quote")     // QuoteModuleService
container.resolve("approval")  // ApprovalModuleService
```

## Read Next

- [Concept: Local-First IaC](../infrastructure/local-first-iac.md) — how these modules are deployed
- [Entity: Observability Stack](../infrastructure/observability-stack.md) — how module metrics are captured
- [Entity: Terraform Bootstrap](../infrastructure/terraform-bootstrap.md) — S3 state genesis module
- [Entity: Terraform Workload Modules](../infrastructure/terraform-modules.md) — 7 workload modules (tags, foundation, network, compute, data, observability)
- [Architecture Overview](../architecture/overview.md)
- [ADR-010: Medusa OOTB Extended](../architecture/adrs/ADR-010-medusa-ootb-extended.md) — why B2B modules extend Medusa OOTB rather than replace it
