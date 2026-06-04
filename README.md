# Digital-Commerce — OceanSoft B2B Marketplace

B2B marketplace platform built on Medusa v2 and Next.js 15. Backend modules for company management, employee spending limits, quote negotiation, and approval workflows. Local-first development with Docker + Terraform IaC skeleton for future AWS deployment.

**Status**: Phase 1 (Local Validation) of 6-Phase SDLC. No AWS resources provisioned yet.

## Quick Start

**Prerequisites**: Docker, docker-compose, Node.js 22+, pnpm 10.11.1+

```bash
# 1. Clone and enter the workspace
git clone https://github.com/nnthanh101/Digital-Commerce.git
cd Digital-Commerce

# 2. Start the full stack (Medusa backend + Next.js storefront + Postgres + Redis)
task up

# 3. Verify endpoints are live
curl -fsS http://localhost:9000/health     # Medusa backend
curl -fsS http://localhost:8000            # Next.js storefront

# 4. Run E2E smoke test (optional — tests login → company → quote → approval flow)
task test:e2e

# 5. Stop all services
task down
```

Services will be live on:
- **Medusa Admin** — http://localhost:9000/app (default credentials in `.env.template`)
- **Storefront** — http://localhost:8000
- **Database** — postgresql://postgres:postgres@localhost:5432/ec-store
- **Cache** — redis://localhost:6379

All commands run inside Docker containers. No host-side package installation required.

## What This Is

**For OceanSoft** — The alpha marketplace at www.oceansoft.io runs this stack in production using the `@oceansoft/medusa-plugin-b2b` v0.1 plugin.

**For Plugin Licensees** — Dev shops and merchants buy/license the `@oceansoft/medusa-plugin-b2b` plugin to build their own B2B marketplaces on Medusa. This repo is the reference architecture showing how to integrate the plugin + run locally in Docker.

## Architecture

| Layer | Component | Tech | Port |
|-------|-----------|------|------|
| **Storefront** | Next.js 15 App Router | React 19, TypeScript, Tailwind | 8000 |
| **Backend** | Medusa v2.15+ | Node.js 22, TypeScript, tRPC APIs | 9000 |
| **Modules** | @oceansoft/medusa-plugin-b2b | Company, Quote, Approval workflows | (internal) |
| **Data** | PostgreSQL | 15-alpine, per Medusa Docker reference | 5432 |
| **Cache** | Redis | 7-alpine, per Medusa Docker reference | 6379 |

All services run in a single `docker-compose.yml` file — same file used by VS Code Dev Containers for zero-friction onboarding. Container names follow the `ec_*_b2b` convention (product-flavored, operator-overridable via `COMPOSE_PROJECT_NAME`).

## Key Features

- **Company Management** — Register B2B companies; add employees with spending limits
- **Quote Negotiation** — Request quotes for bulk orders; negotiate pricing
- **Approval Workflows** — Manager/admin approval gates for high-value orders
- **Bulk Add-to-Cart** — B2B buyers add multiple SKUs in one action
- **Order Editing** — Post-order modifications without full re-checkout

## Repository Layout

```
Digital-Commerce/
├── apps/backend/              Medusa backend (thin consumer app)
├── apps/storefront/           Next.js storefront
├── packages/medusa-plugin-b2b/ B2B modules (company, quote, approval)
├── infra/terraform/           AWS IaC skeleton (validate-only at P1)
├── tests/                     QA domain (Taskfile + TEST-PLAN + TEST-CASES + e2e/)
├── docs/                      Architecture + quickstart + licensing
├── docker-compose.yml         Service definitions (containers: ec_*_b2b)
├── Taskfile.yml               Task runner (task up, task test:e2e, etc.)
└── LICENSE                    MIT (root); see licensing.md for boundaries
```

## Licensing

**MIT Public License** (applies to `apps/`, `infra/`, `docs/`, root configs):
- Free to use, modify, distribute — standard MIT terms
- Source: https://github.com/nnthanh101/Digital-Commerce

**OceanSoft Commercial License v1.0** (applies to `packages/medusa-plugin-b2b/` only):
- Proprietary B2B module package sold separately to licensees
- Status: DRAFT (finalized before v1.0.0 GA)
- See `packages/medusa-plugin-b2b/LICENSE.md` and `docs/licensing.md` for boundaries

**Third-party attribution**: Medusa v2 framework (`@medusajs/framework`) is OSS (MIT). Initial scaffolding used code patterns from Medusa's `dtc-starter` and `b2b-starter` (MIT, © 2024 Medusa Holdings). See `THIRD-PARTY-NOTICES.md`.

## Documentation

- **[Quickstart](./docs/quickstart.md)** — Step-by-step setup + verification commands
- **[Architecture](./docs/architecture.md)** — Component diagram, stack decisions, AWS roadmap
- **[Licensing](./docs/licensing.md)** — MIT vs. commercial boundary table

## Development

**Run tests locally**:
```bash
task test          # Unit tests (pnpm turbo test)
task lint          # Lint (pnpm turbo lint)
task test:e2e      # Playwright E2E
task seed          # Seed dev database
```

**Validate Terraform**:
```bash
task tf:validate   # Exit 0 = valid structure
task tf:cost       # Infracost breakdown ($0 at P1 — no resources yet)
```

**View logs**:
```bash
task logs          # Tail all services
```

## Support

- **Bug reports** — Use GitHub Issues
- **Commercial license inquiries** — Contact sales@oceansoft.io
- **Technical questions** — See `docs/` or check Medusa docs at medusajs.com

## Contributing

This repository accepts contributions under the MIT License (public code) and OceanSoft Commercial License (plugin code). See `CONTRIBUTING.md` (if present) for guidelines.

---

**Copyright** © 2026 OceanSoft. All rights reserved for commercial components; MIT License for public reference implementation.
