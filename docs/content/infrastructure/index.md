---
title: "Index: Infrastructure"
description: Directory of compiled wiki pages for the B2B-Commerce infrastructure layer — Terraform modules, observability stack, and IaC concepts — so you can navigate to the right page without reading raw HCL.
tags: [infra, terraform, observability, index, iac, aws]
source_refs:
  - path: "infra/terraform/aws"
    last_compiled: "2026-06-07"
  - path: "infra/observability"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T10:00:00Z"
---

# Index: Infrastructure

Infrastructure for B2B-Commerce lives under `infra/`. At Phase 1 (today) all IaC is validate-only — no real AWS resources are provisioned. Cloud resources are provisioned at Phase 3 (v0.3, Deploy milestone).

## Pages in This Section

| Page | Type | Purpose |
|------|------|---------|
| [Entity: Terraform Bootstrap](./terraform-bootstrap.md) | Entity | The S3 state genesis module — solves the bootstrap deadlock; run-once per environment |
| [Entity: Terraform Workload Modules](./terraform-modules.md) | Entity | The 7 workload modules (tags, foundation, appregistry, network, compute, data, observability) — what each creates now vs. at v0.3 |
| [Concept: Local-First IaC](./local-first-iac.md) | Concept | The principle: validate locally (Docker + LocalStack) before any real AWS spend; the bootstrap anti-deadlock pattern |
| [Entity: Observability Stack](./observability-stack.md) | Entity | Prometheus + Grafana local stack — scrape targets, datasource uid, dashboard auto-load, AWS promotion path |

## Infrastructure at a Glance

```mermaid
graph TD
    subgraph "Phase 1 — Local (today)"
        Docker["Docker Compose\n(all services)"] --- Obs["Prometheus + Grafana\n(infra/observability/)"]
        TFValidate["terraform validate\n+ LocalStack apply"] --- Bootstrap["bootstrap/\n(S3 state pattern)"]
        TFValidate --- Foundation["foundation/\n(S3 media, secrets, SQS/SNS)"]
    end
    subgraph "Phase 3 — AWS (v0.3)"
        ECS["modules/compute\n(ECS)"]
        RDS["modules/data\n(RDS + Redis)"]
        VPC["modules/network\n(VPC 3-tier)"]
        AMP["modules/observability\n(AMP + AMG)"]
    end
    Bootstrap -->|"state bucket"| Foundation
    Foundation --> ECS
    Foundation --> RDS
```

## Read Next

- [Architecture Overview](../architecture/overview.md) — full stack diagram
- [Index: B2B Modules](../modules/index.md) — backend module pages
