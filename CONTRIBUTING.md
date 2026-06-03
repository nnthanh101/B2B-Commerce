# Contributing to Digital-Commerce

This repository is operated on a **LEAN / 5S / 3定 (Three Fixes)** discipline. The full standard is in [`docs/LEAN-5S-3T.md`](./docs/LEAN-5S-3T.md); this is the short version.

## Ground rules

- **Small, single-purpose changes.** One concern per PR. Unrelated churn is waste (_muda_).
- **Do not bulk-reformat the vendored apps.** The Medusa starter (`apps/`) self-manages its formatting; mass edits there destroy traceability to upstream.
- **A place for everything** (定位 Fixed Location): runtime in `apps/`, IaC in `infra/`, knowledge in `docs/`, automation in `.github/`, project meta at root.

## Local setup

```bash
pnpm install
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env
pnpm dev
```

## Before you push (Shine)

```bash
pnpm lint
pnpm dlx prettier@3 --check .
pnpm dlx markdownlint-cli2 "**/*.md" "!apps/**"
pnpm test
```

## Branching & commits

- Branch from `b2b`: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `infra/…`.
- **Conventional Commits** (`type(scope): summary`) — enables traceable history and SemVer changelogs.
  - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `infra`, `ci`, `perf`.
- Open a PR into `b2b`; fill in the template; CI must be green; a CODEOWNER must approve.

## Definition of Done

1. Acceptance criteria of the linked [INVEST story](./features.md) are met and testable.
2. `pnpm lint`, Prettier, markdownlint, and tests pass (CI green).
3. Docs updated (`README` / `CHANGELOG` / `features.md` / `TODO.md`) as needed.
4. For infra: required FinOps tags present; ADR added for architectural decisions.
5. For AI tools: server-side authorization + audit evidence; agent eval set passes.

## Releases

Semantic Versioning. Every user-visible change is recorded in [`CHANGELOG.md`](./CHANGELOG.md) under `[Unreleased]`, then promoted on tag.
