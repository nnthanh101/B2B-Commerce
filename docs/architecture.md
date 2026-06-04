# Architecture

## System Overview

Digital-Commerce is a **B2B marketplace platform** separating concerns across three tiers:

```
                         Developer / HITL
                                |
                    +--------+--+--+--------+
                    |                       |
            +-------+--------+      +-------+--------+
            | Next.js 8000   |      | Medusa Admin   |
            | Storefront     |      | :9000/app      |
            +-------+--------+      +-------+--------+
                    |                       |
                    +-------+-------+-------+
                            |
                    +-------+--------+
                    |  Medusa API    |
                    |  :9000         |
                    +-------+--------+
                            |
            +-------+-------+-+-----+-------+
            |       |         |     |       |
        +---+--+  +-+-+  +----+--+  |  +---+--+
        |Compy.|  |Qte.|  |Aprv.|  |  |Cart |  (plugin modules)
        +------+  +----+  +-----+  |  +-----+
                                   |
        +-------+-------+---------+|+--------+
        |       |       |         | |
    +---+--++-+-++-++-+-++-+---++------+
    |Postgres|  |Redis  |  |Jobs | Webhooks|
    +--------+  +-------+  +-----+--------+
```

### Repo Layout

```
Digital-Commerce/                   (MIT licensed public monorepo)
├── apps/backend/                  Medusa consumer app (thin wrapper)
│   ├── medusa-config.ts           Registers @oceansoft/medusa-plugin-b2b modules
│   ├── src/api                    API extensions (custom endpoints if any)
│   ├── src/admin                  Admin dashboard customizations
│   └── .env.template              Backend env vars (DATABASE_URL, REDIS_URL, etc.)
├── apps/storefront/               Next.js 15 App Router buyer/merchant UI
│   ├── src/app/[countryCode]/     Locale-aware routes
│   ├── src/modules/{account}      B2B account dashboard (companies, quotes, etc.)
│   └── .env.template              Storefront env (NEXT_PUBLIC_MEDUSA_BACKEND_URL, etc.)
├── packages/medusa-plugin-b2b/    B2B commerce modules (OceanSoft Commercial License DRAFT)
│   ├── src/modules/
│   │   ├── company/               Companies, employees, spending limits
│   │   ├── quote/                 Quote requests, negotiation, pricing
│   │   └── approval/              Approval workflows, permissions
│   ├── src/workflows/             Async flow orchestration (approval, order hooks)
│   ├── src/links/                 Module relationships + event handlers
│   ├── src/index.ts               Public API exports (COMPANY_MODULE, etc.)
│   └── LICENSE.md                 OceanSoft Commercial v1.0 DRAFT
├── infra/terraform/               AWS IaC skeleton (validate-only at Phase 1)
│   ├── providers.tf               AWS provider + FOCUS 1.2+ tags
│   ├── versions.tf                Terraform ≥1.9 requirement
│   ├── environments/{dev,staging,prod}/
│   ├── modules/{network,compute,data,observability}/
│   └── README.md                  (cites AWS myApplications blog)
├── tests/e2e/                     Playwright golden-path tests
│   └── b2b-smoke.spec.ts          Login → create company → quote → approval
├── docs/                          adlc.oceansoft.io documentation skeleton
├── docker-compose.yml             4 services: Medusa, storefront, Postgres, Redis
├── Dockerfile                     Multi-stage build (pnpm variant per Medusa reference)
├── Taskfile.yml                   Task runner: up, down, test, tf:*, etc.
├── package.json                   Root workspace definition
├── pnpm-workspace.yaml            Monorepo configuration
├── LICENSE                        MIT
└── README.md
```

## Technology Stack

Node.js 22 (Medusa 2.15.5+) • Next.js 15 App Router • PostgreSQL 15 • Redis 7 • pnpm workspace • Terraform 1.9+ • Playwright 1.49+ • docker-compose. All pinned in `package.json` and `.nvmrc`.

## Key Decisions

1. **Single docker-compose.yml** — Dev Containers reuse same file as bare-metal to eliminate environment drift
2. **Plugin extracted day-1** — `packages/medusa-plugin-b2b/` enforces clean boundaries; justifies v0.3 split
3. **Terraform validate-only** — No AWS credentials needed at P1; cost visibility before spend
4. **No backward compatibility** — Node 22 only; Next.js 15 App Router only; modern stack, no legacy support

## AWS Deployment Roadmap

### Phase 1 (Current): Local-First

- Docker Compose for local development and CI testing
- Terraform IaC skeleton (validate-only, no resources)
- Infracost reporting (cost forecasting)

### Phase 3 (v0.3 Milestone): AWS Provisioning

Real infrastructure planned (see `infra/terraform/README.md` v0.3 checklist):
- **ECS Fargate** cluster for Medusa backend + storefront
- **RDS Postgres** managed database (replaces local postgres)
- **ElastiCache Redis** for sessions and job queue
- **Application Load Balancer** (ALB) with Route53 DNS
- **S3** for media storage (product images, documents)
- **AWS myApplications** registration for cost aggregation
- GitHub Actions OIDC role (no long-lived credentials)

**Reference**: [AWS myApplications for Terraform](https://aws.amazon.com/blogs/mt/getting-started-with-myapplications-for-terraform-managed-applications/)

## Why We Forked (IP Boundary)

This repository was initially scaffolded from Medusa's public `dtc-starter` and `b2b-starter` repositories (both MIT licensed, © 2024 Medusa Holdings). The initial code patterns and module structures were borrowed as a one-time bootstrap draft.

**From v0.1.0 onward**: All derived code is maintained as OceanSoft IP. No re-sync with upstream expected. Future Medusa framework updates are cherry-picked as feature work, not automated syncs. This approach:
- Preserves the commercial licensing model (plugin sold separately)
- Eliminates upstream-sync cognitive overhead
- Allows OceanSoft to independently maintain and optimize
- Maintains attribution via `THIRD-PARTY-NOTICES.md`

## Observability & Security

**Phase 1 (now)**: Container logging via `task logs`; dev-only credentials in `.env`.

**Phase 3+**: VPC isolation, IAM roles (OIDC), CloudWatch dashboards, X-Ray tracing, WAF rules on ALB.

---

**Questions?** See `README.md` for support links or `docs/licensing.md` for commercial licensing details.
