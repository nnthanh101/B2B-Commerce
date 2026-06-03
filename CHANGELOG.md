# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **LEAN/5S/3定 guardrails** — `.editorconfig`, `.gitattributes`, Prettier, markdownlint, CI (`.github/workflows/ci.yml`), `CODEOWNERS`, PR template, `CONTRIBUTING`/`SECURITY`/`CODE_OF_CONDUCT`, and `docs/LEAN-5S-3T.md`.
- **Local Docker-first stack** — `docker-compose.yml`, shared `Dockerfile`, `start.sh`/`start-storefront.sh`, `.dockerignore`, and a `Makefile` (`make up`/`down`/`migrate`/`admin`). Backend :9000, Admin /app, storefront :8000.
- **Containerised Terraform** — `nnthanh101/terraform` runner image (`infra/docker/terraform`) and a runnable local Docker-provider stack (`infra/terraform/local`) for IaC parity; `infra/terraform/aws/` reserved for Phase 2.
- `docs/LOCAL.md` developer runbook.

### Changed

- `apps/backend/medusa-config.ts` — env-driven SSL (off locally; `DATABASE_SSL=true` for RDS) and Admin Vite HMR for Docker.
- README quickstart is now Docker-first; removed an incorrect `seed` step (the starter ships no seed script).

### Planned

- Phase 0 — AWS account & governance baseline (IAM Identity Center, CloudTrail, Config, GuardDuty, Security Hub, Budgets, Terraform remote state, AppRegistry, FOCUS 1.2 export). See [`TODO.md`](./TODO.md).
- Phase 2 — AWS Terraform modules (network, rds-postgres Multi-AZ, ecs-service, appregistry, finops-focus-export) + sized cost baseline.

## [2.0.0] - 2026-06-03

A clean, **no-backward-compatibility** reset of the Digital-Commerce repository onto the active Medusa B2B Starter foundation for the OceanSoft.io B2B marketplace (2026–2030).

### Added

- Adopted the active [`medusajs/b2b-starter`](https://github.com/medusajs/b2b-starter) (Medusa 2.15.5 + Next.js 15.5.18) as the commerce foundation at repo root (`apps/backend`, `apps/storefront`).
- `docs/b2b-blueprint.md` — business proposal & AWS implementation blueprint (Medusa vs Vercel decision, target architecture, Terraform, ADLC AI model, FinOps FOCUS 1.2+, roadmap, RACI, risks, ADRs).
- `docs/ASSESSMENT.md` — independent implementation-readiness score of the blueprint (**79/100, B+**) with a severity-ranked gap register and phase-gated go/no-go.
- `features.md` — product backlog expressed as INVEST user stories.
- `TODO.md` — technical / infrastructure / utilities backlog mapped to assessment gaps G-01…G-12.
- `NOTICE` and `docs/third-party/` — open-source attribution and preserved upstream licenses.

### Changed

- Rewrote `README.md` for the B2B headless commerce + marketplace foundation.
- Updated `LICENSE` copyright span to 2022–2026.

### Removed

- Retired the deprecated 2022 deliverables: `admin/` (Gatsby admin), `backend/` (legacy backend), `storefront/` (legacy storefront), `README/` (legacy assets), `.gitpod.yml`, root `package-lock.json`, and `.github/workflows/CI-Vercel-Prod.yml`.

> Recovery: the pre-reset state is preserved at git tag `pre-b2b-restructure-2026-06-03`.

## [1.0.1] - 2022-11-08

### Added

- Dev/Test Docker + Linux.

## [1.0.0] - 2022-11-01

### Added

- Initial version; MIT License, OceanSoft branding, 3-tier architecture demos.

[Unreleased]: https://github.com/nnthanh101/Digital-Commerce/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/nnthanh101/Digital-Commerce/releases/tag/v2.0.0
