# ADR-010: Medusa OOTB-Extended (Reuse Core, Extend via First-Class Extension Points)

**Status**: Accepted
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`

## Summary

B2B-Commerce uses **Medusa 2.x out-of-the-box (OOTB)** for cart, order, product, inventory, customer, payment-stub, and admin scaffolding, and **extends Medusa via its first-class extension points** — custom modules, custom workflows, and admin SDK extensions. **We do NOT fork Medusa core.** Upstream Medusa releases land via standard `@medusajs/*` npm version bumps tracked by Renovate; OceanSoft owns every extension surface under `apps/backend/src/{modules,workflows,api,subscribers,jobs,links}/`. This ADR makes the extension boundary explicit so future Medusa releases do not trigger an architectural review.

## Context

Two anti-patterns frame this decision:

1. **Forking Medusa core** to embed B2B behaviour into the framework itself. This appears attractive (fewer abstraction layers, no extension boilerplate) but creates permanent upstream-merge debt — every Medusa point release becomes a multi-hour rebase, and OceanSoft becomes responsible for security patches to the entire Medusa surface.
2. **Wrapping Medusa with a parallel framework** (custom service layer, custom workflow engine, custom admin UI). This bypasses Medusa's investment in cart / order / inventory primitives and forces OceanSoft to re-implement table stakes.

The borrow-as-init-draft pattern (`.claude/memory/feedback_borrow_as_init_draft.md`) applies at the **starter-scaffold** layer (see [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md) and [ADR-009](./ADR-009-apps-as-first-party-not-upstream.md)) — we own the starter modules and the application shell from v0.1.0. The Medusa **framework itself** is a different category: it is a versioned npm dependency, not init-draft scaffolding. We sync `@medusajs/medusa` and friends on the standard package-update cadence; we do not fork them.

## Decision

**Reuse Medusa OOTB; extend via three first-class extension points:**

### Extension Point 1: Custom Modules

Custom business logic ships as Medusa modules under `apps/backend/src/modules/`. Today's modules (cited from `apps/backend/medusa-config.ts`):

- `apps/backend/src/modules/company/` — B2B company / employee model, spending limits
- `apps/backend/src/modules/quote/` — quote state machine + message thread
- `apps/backend/src/modules/approval/` — approval records, approver-role routing

Each module is registered in `medusa-config.ts` via `[MODULE_TOKEN]: { resolve: "./modules/..." }`. New domain capabilities (e.g., SOW generation, supplier registry) land as additional modules — never as core-Medusa patches.

### Extension Point 2: Custom Workflows

Business orchestration ships as Medusa workflows under `apps/backend/src/workflows/`. Today's inventory:

- **8 quote workflows** (verified at `apps/backend/src/workflows/quote/workflows/index.ts`): `create-quote`, `create-quote-message`, `create-request-for-quote`, `customer-accept-quote`, `customer-reject-quote`, `merchant-reject-quote`, `merchant-send-quote`, `update-quote`
- **4 approval workflows** (verified at `apps/backend/src/workflows/approval/workflows/index.ts`): `create-approvals`, `create-approval-settings`, `update-approval`, `update-approval-settings`
- **3 cart-hook workflows**: `validate-cart-completion`, `validate-add-to-cart`, `validate-update-cart`

Workflows are the **only legitimate orchestration surface** for multi-step business logic (per [ADR-004](./ADR-004-next-js-server-action.md)). Server Actions are UI mutations; workflows are durable state machines.

### Extension Point 3: Admin SDK Extensions

B2B-specific admin surfaces (company management, quote queue, approval review) extend the Medusa admin via the Admin SDK — not via fork. Today's extensions live under `apps/storefront/src/modules/account/components/` (23 B2B account UI components per [b2b-blueprint.md](../b2b-blueprint.md) features matrix) and admin routes under `apps/backend/src/admin/` (per Medusa Admin SDK conventions).

### Upstream Sync Discipline

- `@medusajs/medusa`, `@medusajs/framework`, `@medusajs/admin-sdk` and friends are tracked as standard npm dependencies with Renovate / Dependabot updates.
- Major-version bumps (e.g., Medusa 2.x → 3.x) trigger a **per-PR evaluation with full test re-run** — no auto-merge. The two-persona Playwright smoke test (DC-020 in [discovery-brief.md](../discovery-brief.md)) is the regression gate.
- Minor / patch releases follow standard PR review without an ADR refresh.

### ADLC AI Gateway Integration (Roadmap v0.6)

Per [b2b-blueprint.md](../b2b-blueprint.md) Deployment Evolution Timeline, the ADLC AI Gateway is **aspirational at v0.6 — zero code today**. When it lands, the quote workflows (Extension Point 2) are the **canonical integration surface** — AI agents draft quote responses, summarise threads, and suggest RFQ templates on top of `create-quote`, `merchant-send-quote`, and `update-quote`. Subagent observability metrics land earlier at v0.3 (per [ADR-007](./adr-007-grafana-prometheus-local-first.md)); the gateway proper lands at v0.6.

## Consequences

**Accepted**:

- Medusa minor / patch releases land as normal npm updates — no architectural review per upgrade.
- B2B differentiation (the quote-assisted workflow + spending-limit enforcement + multi-step approval) is encoded in OceanSoft-owned modules and workflows — not in patches to upstream Medusa.
- The two-persona test gate (buyer-employee + admin/sales-manager from [discovery-brief.md](../discovery-brief.md)) catches regressions across upgrades.

**Trade-offs**:

- Custom modules and workflows must conform to Medusa's evolving extension API. Breaking changes in Medusa's module loader (rare, but possible at major bumps) require module refactoring — accepted as the cost of staying on supported upstream.
- We cannot patch Medusa core to fix a bug that affects OceanSoft uniquely; we file the bug upstream and ship a workaround in our modules. Acceptable: Medusa's maintainer responsiveness is documented; OceanSoft's bug surface is bounded by the OOTB feature set we actually use.

**Rejected**:

- **Fork Medusa core** — permanent upstream-merge debt; rejected. Anti-pattern: `UPSTREAM_SYNC_DEBT`.
- **Wrap Medusa with a parallel framework** — destroys the time-to-market advantage of reusing Medusa primitives. Rejected.

## Cross-References

- [ADR-008: Medusa B2B Module Reuse](./adr-008-medusa-modules-reuse-vs-new.md) — module-layer ownership companion
- [ADR-009: Apps as First-Party Code](./adr-009-apps-as-first-party-not-upstream.md) — application-shell ownership companion
- [b2b-blueprint.md — B2B Features Matrix](../b2b-blueprint.md) — extension-point evidence
- [discovery-brief.md — Buyer-employee + admin personas and 5S Sort discipline](../discovery-brief.md)
- Memory: `.claude/memory/feedback_borrow_as_init_draft.md`
