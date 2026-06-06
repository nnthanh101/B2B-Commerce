# ADR-008: Reuse B2B Commerce Modules (Company, Quote, Approval)

**Status**: Accepted
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-digital-commerce-p1-2026-06-04.json`

## Summary

Digital-Commerce **reuses the B2B Commerce modules** (`company`, `quote`, `approval`) as the canonical implementation of the quote-assisted B2B workflow. These modules were borrowed as 1st-init drafts from `medusajs/b2b-starter` (MIT) and are now owned outright by OceanSoft from v0.1.0 forward — no upstream sync, no resync CI. The decision is grounded in `feedback_borrow_as_init_draft.md`: borrow the scaffold, then forget upstream.

## Context

The quote-assisted B2B workflow (Quote → Approval → PO → Invoice → SOW) is the product's unfair-advantage capability — and it is not trivial to build from scratch. The implementation needs:

- Company / employee data model with spending-limit semantics
- Quote state machine (draft, requested, sent, accepted, rejected) with cart snapshot
- Approval workflow with approver-role routing
- Spending-limit cart validation hook
- Bulk-add-to-cart validation hook
- Admin UI surfaces for the company / employee / quote / approval entities

Two options were considered:

1. **Build from scratch** as `@oceansoft/medusa-plugin-b2b` from line 1
2. **Reuse the B2B Commerce** (MIT-licensed open-core scaffold) and own it as first-party code from v0.1.0

The B2B Commerce at `medusajs/b2b-starter` already implements ~80% of the surface above with proven module wiring. Building from scratch would burn 4-6 weeks rebuilding what already works, with no functional differentiation at the module level (the differentiation is in ANZ regulator context, FOCUS 1.2+ tags, and ADLC governance — none of which are module-internal).

The borrow-as-init-draft pattern is explicit in the project memory at `.claude/memory/feedback_borrow_as_init_draft.md`: "utilise all of code/docs/material/templates from Medusa as 1st-init draft ONLY, then forget them — maintain & develop our own IP & deliverables."

## Decision

**Reuse the three B2B Commerce modules as first-party OceanSoft code from v0.1.0:**

- **`apps/backend/src/modules/company/`** — company + employee entities, spending limits, approval settings. Built and wired in `apps/backend/medusa-config.ts` via `COMPANY_MODULE` token.
- **`apps/backend/src/modules/quote/`** — quote entity, line items, status transitions, message thread. Built and wired via `QUOTE_MODULE` token.
- **`apps/backend/src/modules/approval/`** — approval record, approver assignments, threshold logic. Built and wired via `APPROVAL_MODULE` token.

**Module wiring verified** in `apps/backend/medusa-config.ts`:

```typescript
modules: {
  [COMPANY_MODULE]: { resolve: "./modules/company" },
  [QUOTE_MODULE]: { resolve: "./modules/quote" },
  [APPROVAL_MODULE]: { resolve: "./modules/approval" },
}
```

**Workflows verified built** in `apps/backend/src/workflows/`:

- **Quote workflows (8 files)**: `create-quote.ts`, `create-quote-message.ts`, `create-request-for-quote.ts`, `customer-accept-quote.ts`, `customer-reject-quote.ts`, `merchant-reject-quote.ts`, `merchant-send-quote.ts`, `update-quote.ts` (plus `index.ts`)
- **Approval workflows (4 files)**: `create-approvals.ts`, `create-approval-settings.ts`, `update-approval.ts`, `update-approval-settings.ts`
- **Cart validation hooks**: `apps/backend/src/workflows/hooks/validate-cart-completion.ts`, `validate-add-to-cart.ts`, `validate-update-cart.ts`

**IP ownership directive** (from CA coordination log, lines 51-58):

- All `package.json` files declare `author: "OceanSoft"`; root, apps, infra, docs use `license: "MIT"`; `packages/medusa-plugin-b2b/` uses `license: "SEE LICENSE IN LICENSE.md"` (commercial).
- Single `THIRD-PARTY-NOTICES.md` at repo root captures B2B Commerce / DTC starter MIT compliance. No per-file attribution comments.
- Every specialist delegation prompt for Row 5 (plugin extraction) includes an explicit IP-scrub directive: `grep -rn "from b2b-starter\|based on dtc-starter\|borrowed from" packages/ apps/` MUST return 0 results before the row passes.
- README and docs present artifacts as OceanSoft products, NOT as "forks of X."
- Post v0.1.0: no upstream sync, no Renovate watch on Medusa starter repos. Only `@medusajs/*` package versions are tracked (the framework, not the starter).

**Roadmap**:

- **v0.2** — expose `company` REST API at `apps/backend/src/api/companies/` (module exists, no public routes today). Admin spending-limit management UI.
- **v0.6** — ADLC AI Gateway integration with the `quote` module is **ASPIRATIONAL** (zero code today; tracked as roadmap in [b2b-blueprint.md](../b2b-blueprint.md) v0.6 row). Phase v0.3 ships subagent observability metrics ([ADR-007](./adr-007-grafana-prometheus-local-first.md)); the AI Gateway proper lands at v0.6. Never claimed as built.

**5S Sort discipline**: every retained module justifies its existence:

- `company/` — without it: no company/employee model, no spending limits, no role routing. Quote-assisted workflow is impossible.
- `quote/` — without it: no canonical quote state machine. Email + spreadsheets remain the system of record.
- `approval/` — without it: no audit trail for APRA CPS 234 §36. Manual approval theatre.

## Consequences

**Accepted**:

- ~80% of the quote-assisted workflow ships in v0.1.0 — 4-6 weeks of greenfield work saved.
- Module-level functionality is proven (community-tested in `medusajs/b2b-starter`); differentiation is in ANZ regulator framing + FOCUS 1.2+ tagging + ADLC governance.
- Workflow file inventory is honest and verifiable — 8 quote workflows + 4 approval workflows + 3 cart hooks, all cited by exact filename.

**Trade-offs**:

- We own all bugs in the borrowed code from v0.1.0 — no "wait for upstream fix." Mitigation: the borrowed modules are small (< 5k LOC combined); ownership is tractable.
- Future B2B Commerce improvements are not free — they are deliberate cherry-picks treated as feature work. Acceptable: removes cognitive overhead of "should we resync?" on every feature.

**Rejected**:

- **Build from scratch** — 4-6 week schedule slip with no functional differentiation at module layer.
- **Fork-and-track** B2B Commerce as a vendored upstream — creates ongoing sync debt that destroys ownership clarity. Explicit anti-pattern: `UPSTREAM_SYNC_DEBT`.

## Cross-References

- [b2b-blueprint.md — B2B Features Matrix](../b2b-blueprint.md)
- [discovery-brief.md — ANZ regulated-industry context for B2B modules and 5S Sort discipline](../discovery-brief.md)
- [golden-path.md — Demo the running modules](../golden-path.md)
- ADR-009: Apps as First-Party Code (companion ownership decision)
- Memory: `.claude/memory/feedback_borrow_as_init_draft.md`
- Memory: `.claude/memory/feedback_5s_sort_before_delegation.md`
- IP scrub: `THIRD-PARTY-NOTICES.md` at repo root
