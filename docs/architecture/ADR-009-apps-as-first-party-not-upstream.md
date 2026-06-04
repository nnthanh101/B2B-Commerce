# ADR-009: Apps as First-Party OceanSoft Code (Not Vendored Upstream)

**Status**: Accepted
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-digital-commerce-p1-2026-06-04.json`

## Summary

`apps/backend/` and `apps/storefront/` are **first-party OceanSoft code** from v0.1.0 — not vendored upstream copies of `medusajs/b2b-starter` or `medusajs/dtc-starter`. The borrow-as-init-draft pattern applies: scaffolds were used as 1st-init reference material; from v0.1.0 onward OceanSoft owns the IP, the upgrade discipline, and the customer-facing surface. Attribution is preserved at a single location (`THIRD-PARTY-NOTICES.md` at repo root) — not as per-file source comments. This ADR is the companion to ADR-008 (which covers the module layer); ADR-009 covers the application shell layer.

## Context

Digital-Commerce was initialised in June 2026 by copying two MIT-licensed Medusa scaffolds:

- **`medusajs/b2b-starter`** — supplied the `apps/backend/` shell with company/quote/approval modules (see ADR-008 for module-layer detail).
- **`medusajs/dtc-starter`** — supplied the Turbo monorepo + pnpm workspace layout, the `apps/storefront/` Next.js shell, and the `tooling/` configuration baseline.

Two strategic options were considered at init time:

1. **Vendor upstream as a `lib/` directory** with a periodic sync CI job — preserves the "this is a Medusa fork" identity, but creates ongoing sync debt and IP ambiguity (who owns customizations? whose customer-facing brand does the UI carry?).
2. **Borrow as 1st-init draft, then own** — copy the scaffold once, scrub upstream attribution comments, apply OceanSoft branding and licence headers, and treat the code as first-party from v0.1.0. No resync job, no upstream tracking.

Option 2 was selected and the rationale is recorded in `.claude/memory/feedback_borrow_as_init_draft.md`. HITL guidance verbatim: "utilise all of code/docs/material/templates from Medusa as 1st-init draft ONLY, then forget them — maintain & develop our own IP & deliverables."

Phase 1 reality (verified):

- `apps/backend/medusa-config.ts` — first-party OceanSoft configuration; no upstream attribution.
- `apps/backend/src/modules/{company,quote,approval}/` — first-party module code (see ADR-008).
- `apps/backend/src/workflows/{quote,approval,company,employee,hooks,order}/` — first-party workflow code.
- `apps/storefront/src/modules/account/components/` — 23 first-party B2B account UI components.
- `THIRD-PARTY-NOTICES.md` at repo root — MIT attribution for `medusajs/b2b-starter` and `medusajs/dtc-starter` is preserved here, in one place.

## Decision

**Apps in `apps/` are first-party OceanSoft code from v0.1.0.** Specifically:

- **`apps/backend/`** — first-party Medusa 2.15.5+ application. OceanSoft owns all customizations, the `medusa-config.ts` wiring, the modules, the workflows, the admin UI extensions, and the customer-facing API surface.
- **`apps/storefront/`** — first-party Next.js 15.5+ application. OceanSoft owns the routing, the B2B account components, the cart UI, the checkout flow, and the customer-facing brand presentation.

**IP-scrub directive** (CA round-1 finding, carried forward as a row-completion gate):

```bash
grep -rn "from b2b-starter\|based on dtc-starter\|borrowed from\|TODO: sync with upstream" apps/ packages/
# MUST return 0 results before any row claiming "apps/ complete" passes
```

This grep runs as part of the Row 4 (fullstack apps) and Row 5 (plugin) completion gates. Failure = scope incomplete.

**Attribution discipline**:

- `THIRD-PARTY-NOTICES.md` at repo root is the single source of attribution for `medusajs/b2b-starter` (MIT) and `medusajs/dtc-starter` (MIT). MIT Section 4(c) preserved.
- No per-file `// Copyright Medusa` comments survive in `apps/` after the IP-scrub gate.
- `apps/backend/package.json` and `apps/storefront/package.json` declare `author: "OceanSoft"` and `license: "MIT"` (open-core apps); the commercial plugin at `packages/medusa-plugin-b2b/` uses `license: "SEE LICENSE IN LICENSE.md"`.
- README files at `apps/backend/README.md` and `apps/storefront/README.md` describe the artifacts as OceanSoft products, NOT as "forks of X" or "based on Y."

**Upgrade discipline** (post v0.1.0):

- `@medusajs/framework` and `@medusajs/admin-sdk` are pinned npm dependencies — these stay tracked via standard package-version management (Renovate / Dependabot only). The framework is upstream; the application shell is OceanSoft.
- Medusa B2B starter / DTC starter repositories are **NOT** tracked. No Renovate watch, no sync CI, no "we should resync from upstream" sprint items.
- Medusa core version bumps (e.g. 2.15.5 → 2.16.x) land via PR with full test re-run (Playwright golden-path + plugin build). No auto-merge — OceanSoft owns the upgrade decision and rollback discipline.
- Bug in `@medusajs/framework` itself → file upstream issue, do not patch in our codebase unless blocking.

**Roadmap**:

- **v0.2** — companies REST API (`apps/backend/src/api/companies/`) + admin spending-limit UI. Module surface exists (see ADR-008); routes are first-party additions.
- **v0.6** — ADLC AI Gateway integration with `apps/backend/` is **ASPIRATIONAL** (zero code today; v0.6 roadmap row in [b2b-blueprint.md](../b2b-blueprint.md)). Phase v0.3 ships subagent observability metrics ([ADR-007](./adr-007-grafana-prometheus-local-first.md)); the AI Gateway proper lands at v0.6. When AI Gateway lands, `apps/backend/` is the deployment target for the integration — but the integration is built first-party, not borrowed.

## Consequences

**Accepted**:

- Single ownership story for buyer-side audits and customer security reviews: "this code is OceanSoft IP." No "let me check what upstream did" deflection.
- No upstream-sync debt. Sessions never stall on "should we resync from `b2b-starter` first?" decisions. The cognitive overhead is removed.
- Commercial integrity: every line in `apps/` is OceanSoft-owned and OceanSoft-licensable. The `packages/medusa-plugin-b2b/` commercial plugin can be relicensed without coordinating upstream.
- Buyer-side audits (customer procurement / IT security reviews) and admin-side audits (alpha customer OceanSoft platform engineering) both encounter a single OceanSoft IP story — no upstream-tracking ambiguity to explain in either persona conversation. Buyer-employees experience faster onboarding (no SBOM ambiguity); admin/sales-managers control the upgrade cadence.

**Trade-offs**:

- We own all bugs from v0.1.0. Mitigation: the scaffolds are small (< 20k LOC combined for apps + modules); ownership is tractable for a one-HITL operating model.
- Future Medusa B2B / DTC starter improvements (e.g. a new payment-flow refactor upstream) are not free — they are deliberate cherry-picks treated as feature work, requiring ADR if architecturally significant.
- Upstream community signal is harder to read — we are not on the `medusajs/b2b-starter` issue tracker daily. Acceptable: regulator-grade B2B is a different problem space from open-core demoware.

**Rejected**:

- **Vendor upstream as `lib/medusa-b2b-starter/`** — creates IP ambiguity (who owns customizations?), upstream-sync debt (`UPSTREAM_SYNC_DEBT` anti-pattern), and customer-confusion ("is this Medusa or OceanSoft?").
- **Periodic resync CI** — sessions stalling on resync decisions. Removed from scope by HITL guidance 2026-06-04.
- **Per-file attribution comments** — clutters source, leaks customer-facing references to upstream brand. Single `THIRD-PARTY-NOTICES.md` is sufficient for MIT Section 4(c).

## ADLC Subagent Governance Posture

`apps/` is the deployment target for future ADLC AI Gateway integration (v0.6 roadmap; zero code today — never claimed as built). When the gateway lands, the integration is OceanSoft first-party code from line 1 — same borrow-as-init-draft discipline, same IP-scrub directive, same single-attribution location. The architectural posture is set today; the implementation is roadmap.

## Cross-References

- [b2b-blueprint.md — Unfair Advantage Stack](../b2b-blueprint.md)
- [discovery-brief.md — 5S Sort discipline and buyer personas](../discovery-brief.md)
- [ADR-008: Reuse Medusa B2B Starter Modules](./adr-008-medusa-modules-reuse-vs-new.md) — companion decision at module layer
- Memory: `.claude/memory/feedback_borrow_as_init_draft.md`
- Attribution: `THIRD-PARTY-NOTICES.md` at repo root
