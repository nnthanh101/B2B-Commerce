---
title: B2B-Commerce Documentation
description: LLM-queryable wiki for the OceanSoft B2B-Commerce platform — compiled by ADLC agents.
sidebar_position: 1
tags: [overview, getting-started, b2b, oceansoft]
source_refs:
  - path: "docs/index.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# B2B-Commerce Documentation

B2B-Commerce is a B2B-Commerce platform built on OceanSoft's B2B plugin for Medusa v2. This documentation covers local development, architecture decisions, and licensing.

## What You'll Build

A production-ready B2B-Commerce where:
- **Buyers** register as companies, add employees with spending limits, request quotes, and place orders through an approval workflow
- **Merchants** manage company accounts, quote negotiations, approval settings, and bulk order fulfillment
- **Operators** (OceanSoft + licensees) deploy locally in Docker, validate in Terraform, and scale to AWS

## 6-Phase SDLC Roadmap

| Phase | Milestone | Status | Goal |
|-------|-----------|--------|------|
| **1. Local** | `v0.1` (P1) | **In Progress** | Docker + Terraform validate + E2E smoke test |
| **2. Quality** | `v0.2` | Planned Q3 2026 | Payment + notifications + seeded data |
| **3. Deploy** | `v0.3` | Planned Q3 2026 | AWS provisioning (ECS/RDS/ElastiCache) + live infracost |
| **4. Monitor** | `v0.4` | Planned Q4 2026 | Observability stack (OpenTelemetry + MELT + dashboards) |
| **5. Integrate** | `v0.5` | Planned Q4 2026 | Multi-tenant operator + license-key validation |
| **6. Scale** | `v1.0` GA | Planned Q1 2027 | Production hardening + commercial support |

## Get Started

1. **[Quickstart](./quickstart.md)** — Run the full stack locally in under 10 minutes
2. **[Architecture Overview](./architecture/overview.md)** — Understand the stack, repo layout, and design decisions
3. **[Licensing](./licensing.md)** — Clarify MIT vs. commercial boundaries for your use case

## B2B Backend Modules (compiled wiki)

| Page | What you learn |
|------|---------------|
| [Entity: Company Module](./modules/company-module.md) | Company accounts, employees, spending-limit reset frequency |
| [Entity: Quote Module](./modules/quote-module.md) | Quote state machine, message thread, cart-to-order lifecycle |
| [Entity: Approval Module](./modules/approval-module.md) | Purchase approval gates, `hasPendingApprovals` guard, admin + manager roles |

## Infrastructure (compiled wiki)

| Page | What you learn |
|------|---------------|
| [Concept: Local-First IaC](./infrastructure/local-first-iac.md) | Validate locally before AWS; bootstrap anti-deadlock pattern |
| [Entity: Terraform Bootstrap](./infrastructure/terraform-bootstrap.md) | S3 state genesis module; run-once procedure; 9/9 LocalStack proven |
| [Entity: Terraform Workload Modules](./infrastructure/terraform-modules.md) | 7 modules — what is live today vs. deferred to v0.3 |
| [Entity: Observability Stack](./infrastructure/observability-stack.md) | Prometheus scrape targets, Grafana datasource uid, dashboard auto-load |

## About OceanSoft

OceanSoft's B2B-Commerce operator and technology company. This reference architecture powers www.oceansoft.io (our alpha customer) and serves as the integration guide for licensees building their own B2B-Commerces on the `@oceansoft/medusa-plugin-b2b` plugin.

---

**Status**: Phase 1 complete. Phase 2+ planned. No external dependencies or upstream sync — this is OceanSoft IP maintained independently.
