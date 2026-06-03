# Digital-Commerce — B2B Headless Commerce & Marketplace for OceanSoft.io

> Greenfield **B2B quote-to-order commerce** and **digital-product marketplace** for [oceansoft.io](https://www.oceansoft.io) — built on the active **Medusa B2B Starter** + **Next.js 15**, deployed on **AWS ECS/Fargate** with **Terraform**, governed through **AWS myApplications / AppRegistry**, measured with **FinOps FOCUS 1.2+**, and AI-assisted through the **[ADLC](https://adlc.oceansoft.io) gateway** with read-first, HITL-controlled write tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Medusa](https://img.shields.io/badge/Medusa-2.15.5-7C53FF)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![Status](https://img.shields.io/badge/status-foundation%20reset-orange)

---

## Why this exists

The problem is **not** "build a beautiful storefront." It is **regulated B2B quote-to-order commerce** with company accounts, spending controls, procurement approvals, quote negotiation, ERP/PIM integration, AI-assisted operations, and auditable FinOps governance. This platform becomes a **digital B2B revenue channel** and a **governed AI-assisted commercial operations platform** — beginning with digital items from [adlc.oceansoft.io/project](https://adlc.oceansoft.io/project) and [adlc.oceansoft.io/marketplace](https://adlc.oceansoft.io/marketplace).

The full reasoning, target AWS architecture, and decision records live in **[`docs/b2b-blueprint.md`](./docs/b2b-blueprint.md)**. An independent implementation-readiness score of that blueprint (**79/100, B+**) lives in **[`docs/ASSESSMENT.md`](./docs/ASSESSMENT.md)**.

## Foundation (what's in the box)

Adopted from the official, actively-maintained [`medusajs/b2b-starter`](https://github.com/medusajs/b2b-starter) (the legacy `b2b-starter-medusa` repo is deprecated). B2B capabilities ship out of the box and are confirmed in-tree (`apps/backend/src/modules`: `company`, `approval`, `quote`, `employee`):

| Capability                                        | Status        | Where                               |
| ------------------------------------------------- | ------------- | ----------------------------------- |
| Company management, employees, roles              | ✅ in starter | `apps/backend/src/modules/company`  |
| Per-employee spending limits                      | ✅ in starter | `company` module                    |
| Approval workflows (admin / sales manager)        | ✅ in starter | `apps/backend/src/modules/approval` |
| Quote management & negotiation (messaging)        | ✅ in starter | `apps/backend/src/modules/quote`    |
| Order editing, bulk add-to-cart, promotions       | ✅ in starter | backend workflows                   |
| Full ecommerce (products, cart, checkout, orders) | ✅ in starter | Medusa core                         |
| AWS infra (Terraform), ADLC AI gateway, FinOps    | 🚧 to build   | see [`TODO.md`](./TODO.md)          |

## Tech stack

| Layer              | Technology                                          | Version          |
| ------------------ | --------------------------------------------------- | ---------------- |
| Backend / commerce | Medusa (`@medusajs/medusa` + `@medusajs/framework`) | 2.15.5           |
| Storefront         | Next.js / React                                     | 15.5.18 / 19.0.5 |
| Monorepo           | pnpm workspaces + Turborepo                         | pnpm 9.15.0      |
| Runtime            | Node.js                                             | ≥ 20             |
| Database           | PostgreSQL                                          | —                |
| Cache / sessions   | Redis (optional locally)                            | —                |
| Target cloud       | AWS ECS/Fargate, RDS, S3, CloudFront, WAF           | —                |
| IaC                | Terraform                                           | —                |

## Monorepo layout

```text
Digital-Commerce/
├── apps/
│   ├── backend/        # Medusa 2.15.5 B2B backend (company, approval, quote, employee modules)
│   └── storefront/     # Next.js 15 B2B storefront
├── docs/
│   ├── b2b-blueprint.md   # Full business proposal & AWS implementation blueprint
│   ├── ASSESSMENT.md      # Independent implementation-readiness score (79/100)
│   └── third-party/       # Preserved upstream licenses (attribution)
├── features.md         # Product backlog — INVEST user stories only
├── TODO.md             # Technical / infra / utilities backlog (incl. ASSESSMENT gaps)
├── CHANGELOG.md        # Keep a Changelog + SemVer
├── NOTICE              # Open-source attribution
├── LICENSE             # MIT
├── package.json        # Turborepo root
├── pnpm-workspace.yaml
└── turbo.json
```

## Quickstart (local)

**Prerequisites:** Node ≥ 20, pnpm 9.15, PostgreSQL, (optional) Redis, Docker.

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure environment
cp apps/backend/.env.template apps/backend/.env        # set DATABASE_URL, JWT_SECRET, COOKIE_SECRET
cp apps/storefront/.env.template apps/storefront/.env  # set NEXT_PUBLIC_MEDUSA_BACKEND_URL + publishable key

# 3. Migrate + seed the backend
cd apps/backend && pnpm medusa db:migrate && pnpm run seed && cd ../..

# 4. Run everything (Turborepo)
pnpm dev
```

Backend runs on `:9000` (admin at `/app`), storefront on `:8000`.

## Environment

**Backend** (`apps/backend/.env.template`): `DATABASE_URL`, `DB_NAME`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`.

**Storefront** (`apps/storefront/.env.template`): `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DEFAULT_REGION`.

> ⚠️ Never commit real secrets. On AWS these resolve from **Secrets Manager** (see `TODO.md`, gap G-07).

## Scripts (root, via Turborepo)

| Command                      | Action                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `pnpm dev`                   | Run backend + storefront in watch mode                    |
| `pnpm build`                 | Build all apps                                            |
| `pnpm lint`                  | Lint all apps                                             |
| `pnpm test`                  | Run all tests                                             |
| `pnpm test:integration:http` | Backend HTTP integration tests (company, quote, approval) |

## Documentation

- **[docs/b2b-blueprint.md](./docs/b2b-blueprint.md)** — full blueprint: decision, AWS architecture, Terraform, ADLC AI model, FinOps, roadmap, RACI, risks, ADRs.
- **[docs/ASSESSMENT.md](./docs/ASSESSMENT.md)** — independent score + severity-ranked gap register + phase-gated go/no-go.
- **[features.md](./features.md)** — product backlog as INVEST user stories.
- **[TODO.md](./TODO.md)** — engineering/infra backlog mapped to assessment gaps.
- **[CHANGELOG.md](./CHANGELOG.md)** — release history.

## Roadmap (summary)

Phase 0 account & governance baseline → Phase 1 local Medusa → Phase 2 AWS dev (Terraform) → Phase 3 ADLC AI gateway → Phase 4 pilot → Phase 5 production hardening. Detail in [blueprint §9](./docs/b2b-blueprint.md).

## Governance & FinOps

Every AWS resource carries the `awsApplication` (AppRegistry) tag plus FinOps tags (`Component`, `Environment`, `BusinessCapability`, `DataClassification`, …) so cost, security findings, and health roll up to one application view in **AWS myApplications**, and cost data exports to **FOCUS 1.2** for unit-economics reporting (cost per quote / order / company / agent interaction).

## License & attribution

MIT — see [LICENSE](./LICENSE). This project is built on the open-source **Medusa B2B Starter** and **Medusa** (both MIT); attributions and preserved upstream licenses are in [NOTICE](./NOTICE) and [`docs/third-party/`](./docs/third-party/).

---

_Maintained by OceanSoft.io · Thanh Nguyen (<nnthanh101@gmail.com>) · Foundation reset 2026-06-03._
