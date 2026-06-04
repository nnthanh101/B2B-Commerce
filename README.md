# Digital-Commerce — OceanSoft B2B Marketplace

B2B marketplace platform built on Medusa v2 and Next.js 15. Backend modules for company management, employee spending limits, quote negotiation, and approval workflows. Local-first development with Docker + Terraform IaC skeleton for future AWS deployment.

**Status**: v1.1.0 — Release Self-QA Framework; Phase 1 local validation of 6-Phase SDLC. No AWS resources provisioned yet.

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

> **Docker-first is the recommended path.** The same `docker-compose.yml` backs both `task up` and the VS Code **Dev Container** (`.devcontainer/devcontainer.json`) — open the folder in VS Code → "Reopen in Container" for one-click, reproducible onboarding (backend + storefront + Postgres + Redis, identical to CI). The no-Docker path below is a constrained-environment fallback for review/reproduce only.

## What This Is

**For OceanSoft** — The alpha marketplace at www.oceansoft.io runs this stack. B2B modules (company, quote, approval) are built directly into `apps/backend` as Medusa v2 modules (0 packages today).

**For operators** — This repo is the reference architecture for a Medusa v2 B2B marketplace. Clone, configure, and deploy. Plugin packaging into a separate `packages/` workspace is deferred to a future v1.x release.

## Architecture

| Layer | Component | Tech | Port |
|-------|-----------|------|------|
| **Storefront** | Next.js 15 App Router | React 19, TypeScript, Tailwind | 8000 |
| **Backend** | Medusa v2.15+ | Node.js 22, TypeScript, tRPC APIs | 9000 |
| **Modules** | Company, Quote, Approval (built-in) | Medusa v2 modules in `apps/backend/src/modules/` | (internal) |
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
├── apps/backend/              Medusa backend (B2B modules: company, quote, approval)
├── apps/storefront/           Next.js storefront
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

**License: MIT (root).** Commercial plugin packaging deferred to a future v1.x when a `packages/` workspace is introduced (0 packages today).

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

## Minimum reproduction (no Docker — fallback only)

> Prefer **Docker-first** (`task up` or the Dev Container above). Use this fallback only when Docker is unavailable (e.g. a constrained review machine).

```bash
# Install pg + redis (macOS — Postgres.app also works in place of brew postgresql@15)
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb ec_store_test

# Install dependencies
pnpm install

# Run integration tests against the local DB
DATABASE_URL=postgres://postgres@localhost:5432/ec_store_test \
  REDIS_URL=redis://localhost:6379 \
  TEST_TYPE=integration \
  task test:integration
```

**Review/approve needs NO runtime.** Reading `CHANGELOG.md` + `RELEASE_NOTES.md` + `git diff --stat` + `tmp/Digital-Commerce/test-results/REPORT.md` is sufficient for a HITL REVIEW/APPROVE decision. The commands above are for local REPRODUCE only.

## Support

- **Bug reports** — Use GitHub Issues
- **Commercial license inquiries** — Contact sales@oceansoft.io
- **Technical questions** — See `docs/` or check Medusa docs at medusajs.com

## Contributing

This repository accepts contributions under the MIT License. See `CONTRIBUTING.md` (if present) for guidelines.

---

**Copyright** © 2026 OceanSoft. MIT License. See LICENSE for details.
