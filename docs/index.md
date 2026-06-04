# Digital-Commerce Documentation

Digital-Commerce is a B2B marketplace platform built on OceanSoft's B2B plugin for Medusa v2. This documentation covers local development, architecture decisions, and licensing.

## What You'll Build

A production-ready B2B marketplace where:
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

1. **[Quickstart](./quickstart.md)** — Run the full stack locally in <10 minutes
2. **[Architecture](./architecture.md)** — Understand the stack, repo layout, and design decisions
3. **[Licensing](./licensing.md)** — Clarify MIT vs. commercial boundaries for your use case

## About OceanSoft

OceanSoft is a B2B marketplace operator and technology company. This reference architecture powers www.oceansoft.io (our alpha customer) and serves as the integration guide for licensees building their own B2B marketplaces on the `@oceansoft/medusa-plugin-b2b` plugin.

---

**Status**: Phase 1 complete. Phase 2+ planned. No external dependencies or upstream sync — this is OceanSoft IP maintained independently.
