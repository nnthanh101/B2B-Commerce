# B2B-Commerce — OceanSoft B2B-Commerce

B2B-Commerce platform built on Medusa v2 and Next.js 15. Backend modules for company management, employee spending limits, quote negotiation, and approval workflows. Local-first development with Docker + Terraform IaC skeleton for future AWS deployment.

**Status**: v1.1.0 (2026-06-04 release) — Release Self-QA Framework; Phase 1 local validation of 6-Phase SDLC. No AWS resources provisioned yet.

> **Architecture**: This repo is a **consumer** of the ADLC framework (enterprise governance, agents, skills) via `.adlc/` symlink. Product code is MIT-licensed (github.com/nnthanh101/B2B-Commerce). Public IaC is `terraform-aws` submodule (github.com/nnthanh101/terraform-aws, MIT). See `CLAUDE.md` for the 4-layer map and public/private boundary.

## Quick Start

**Prerequisites**: Docker, docker-compose, Node.js 22+, pnpm 10.11.1+

```bash
# 1. Clone and enter the workspace
git clone https://github.com/nnthanh101/B2B-Commerce.git
cd B2B-Commerce

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

**For operators** — This repo is the reference architecture for a Medusa v2 B2B-Commerce. Clone, configure, and deploy. Plugin packaging into a separate `packages/` workspace is deferred to a future v1.x release.

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
B2B-Commerce/
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
- Source: https://github.com/nnthanh101/B2B-Commerce

**License: MIT (root).** Commercial plugin packaging deferred to a future v1.x when a `packages/` workspace is introduced (0 packages today).

**Third-party attribution**: Medusa v2 framework (`@medusajs/framework`) is OSS (MIT). Initial scaffolding used code patterns from Medusa's `dtc-starter` and `b2b-starter` (MIT, © 2024 Medusa Holdings). See `THIRD-PARTY-NOTICES.md`.

## Documentation

- **[Quickstart](./docs/quickstart.md)** — Step-by-step setup + verification commands
- **[Architecture](./docs/architecture.md)** — Component diagram, stack decisions, AWS roadmap
- **[Licensing](./docs/licensing.md)** — MIT vs. commercial boundary table

## Testing & Verification

**4-tier test suite** — run all tiers or pick individual ones:

```bash
# Full test suite (Tier 1 + 3a + 3b + 4)
task test:all

# Tier 1: Static analysis (TypeScript, linting)
task lint

# Tier 3a: HTTP smoke tests (backend API verification)
task test:live    # Verifies: health, auth, company/quote/approval routes

# Tier 3b: E2E Playwright (buyer-employee + admin personas)
task test:e2e     # Runs all E2E specs; skips unbuilt features via .fixme()

# Tier 4: Visual verification (screenshots of all major pages)
task test:visual  # Storefront (home, store, cart) + Admin (dashboard, companies, quotes, approvals)

# Preflight health check
task test:config-doctor  # Validates backend, storefront, admin auth before suite runs

# Idempotency gate (runs test:all twice; both must exit 0)
task test:idem
```

**Current test status** (2026-06-05):
- **Tier 1 Static**: ✓ 3/3 PASS (tsc + lint clean)
- **Tier 3a HTTP**: ✓ 9/9 PASS (all admin routes verified, auth enforced)
- **Tier 3b E2E**: 8 PASS / 11 SKIP (`.fixme()` app gaps) / 0 FAIL — see `tests/TEST-CASES.md` for detail
- **Tier 4 Visual**: ✓ 14/14 PASS (both buyer + admin personas, 40–479 KB screenshots)

**Known gaps** (documented, not silent failures):
9 features remain unbuilt (F-2 through F-10). Each blocked E2E test is marked `.fixme()` with app-gap ID and owner. See `RELEASE_NOTES.md` under "Honest backlog" for the full list and unblock paths.

**Seed & verify**:
```bash
task seed         # Idempotent DB seed (companies, quotes, approvals)
task up           # Start all services (backend + storefront + Postgres + Redis)
task down         # Stop all services
task logs         # Tail service logs
```

**Test result files**:
- Playwright JSON: `tmp/B2B-Commerce/test-results/playwright-json-results.json`
- Screenshots: `tmp/B2B-Commerce/test-results/screenshots/VV-*.png`
- HTML report: `test-results/index.html` (auto-generated by Playwright)
- See `tests/TEST-PLAN.md` for test strategy; `tests/TEST-CASES.md` for case details.

**Terraform validation** (infrastructure, read-only at Phase 1):
```bash
task tf:validate   # Exit 0 = valid structure (no AWS resources provisioned yet)
task tf:cost       # Infracost breakdown ($0 at P1)
```

<details>
<summary><strong>Alternative: Local PostgreSQL without Docker (not recommended for production)</strong></summary>

**For REVIEW/APPROVE workflows and local reproduction without Docker:**

> Prefer **Docker-first** (`task up` or the Dev Container above). Use this path only when Docker is unavailable (e.g. a constrained review machine, or when validating database logic locally without containerization).

**Prerequisites**: macOS with Homebrew (or Postgres.app), Node.js 22+, pnpm 10.11.1+

**1. Install and start PostgreSQL + Redis locally**

```bash
# macOS — Postgres.app also works in place of brew postgresql@15
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb ec_store_test
```

**2. Configure environment**

```bash
export DATABASE_URL=postgres://postgres@localhost:5432/ec_store_test
export REDIS_URL=redis://localhost:6379
```

**3. Install dependencies and run services**

```bash
pnpm install

# Start backend (Medusa, port :9000)
cd apps/backend && npm run dev

# In a new terminal, start storefront (Next.js, port :8000)
cd apps/storefront && npm run dev

# In another terminal, start admin (Medusa Admin, port :9000/app)
cd apps/admin && npm run dev
```

**4. Run integration tests against local DB**

```bash
task test:integration
```

**5. View test results**

- Results are written to `tmp/B2B-Commerce/test-results/REPORT.md` (evidence for REVIEW/APPROVE)
- See `docs/release-self-qa-framework.md` for full test strategy

**When you need FULL automated testing** (CI-grade, with clean isolated Postgres):

```bash
# Use the Docker Compose stack instead (cleaner isolation)
docker compose -f docker-compose.test.yml -p ec_test up -d
task test:integration
```

**For REVIEW/APPROVE decisions**: Reading `CHANGELOG.md` + `RELEASE_NOTES.md` + `git diff --stat` + `tmp/B2B-Commerce/test-results/REPORT.md` is sufficient. The commands above are for local REPRODUCE only — no need to run them unless you're debugging locally.

</details>

## Support

- **Bug reports** — Use GitHub Issues
- **Commercial license inquiries** — Contact sales@oceansoft.io
- **Technical questions** — See `docs/` or check Medusa docs at oceansoft.io

## Contributing

This repository accepts contributions under the MIT License. See `CONTRIBUTING.md` (if present) for guidelines.

---

**Copyright** © 2026 OceanSoft. MIT License. See LICENSE for details.
