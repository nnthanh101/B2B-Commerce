# TEST-PLAN — OceanSoft B2B Commerce

QA domain for the Digital-Commerce platform. All test execution is container-based (`task test:<tier>`). Evidence paths write to `tmp/Digital-Commerce/test-results/`.

## Tier Overview

| Tier | Scope | Current Coverage | Gap | Target |
|------|-------|-----------------|-----|--------|
| **Tier 1** Static | TypeScript compile + lint | `task lint` via root Taskfile | No dedicated type-check CI step | v0.2 |
| **Tier 2** Unit | Business logic, pure functions | NOT PROVISIONED | jest config, mocks, snapshot tests | v0.2 |
| **Tier 3a** Integration | Backend API contracts (HTTP) | NOT PROVISIONED | apps/backend/integration-tests/ | v0.3 |
| **Tier 3b** E2E | Full user journeys via browser | `tests/e2e/b2b-smoke.spec.ts` (partial) | Quote negotiation, approval, bulk cart | v0.2 |

## Test Domain Inventory

```
tests/
├── Taskfile.yml          Entry point for all test targets (task test:<target>)
├── TEST-PLAN.md          This file — tier definitions and DoD
├── TEST-CASES.md         Story-mapped test cases (DC-001..DC-105)
└── e2e/
    ├── b2b-smoke.spec.ts  Playwright smoke suite (login → company → quote)
    ├── global-setup.ts    Backend /health ping guard
    ├── global-teardown.ts Post-run teardown
    ├── ENV_README.md      Environment variable documentation
    └── fixtures/          Shared Playwright fixtures
```

Unit and integration directories are placeholders pending v0.2 provisioning.

## BDD/TDD/DDD Status

Deferred to v0.2. Current test suite is written post-implementation (smoke-first). Placeholder structure only; Given/When/Then in TEST-CASES.md describes intent, not implemented BDD steps.

## Definition of Done per Tier

| Tier | PASS criteria |
|------|--------------|
| Tier 1 | `task lint` exits 0; zero TypeScript compile errors |
| Tier 2 | Jest exits 0; all snapshots stable; coverage >=70% on business logic files |
| Tier 3a | All HTTP spec files pass; backend returns expected status codes and schema |
| Tier 3b | Playwright exits 0; screenshots in `tmp/Digital-Commerce/screenshots/` for failures; HTML report in `tmp/Digital-Commerce/test-results/playwright-report/` |

## Evidence Paths Convention

| Artifact | Path |
|----------|------|
| E2E HTML report | `tmp/Digital-Commerce/test-results/playwright-report/` |
| Failure screenshots | `tmp/Digital-Commerce/screenshots/` |
| Unit test JSON | `tmp/Digital-Commerce/test-results/unit-results.json` |
| Integration test log | `tmp/Digital-Commerce/test-results/integration-results.log` |
| Rename/CI V1 log | `tmp/Digital-Commerce/test-results/cycle2-rename-tests-v1-2026-06-04.log` |
