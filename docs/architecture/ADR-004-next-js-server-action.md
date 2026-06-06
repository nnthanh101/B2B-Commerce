# ADR-004: Next.js Server Actions for B2B UI Mutations

**Status**: Accepted (Phase 1 storefront, v0.1)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`

## Summary

B2B-Commerce **uses Next.js Server Actions** for B2B-specific UI mutations (quote requests, approval decisions, quote messaging, cart operations). Server Actions provide a **server-side mutation pattern with built-in CSRF protection, cookie-based auth pass-through, and no additional API-layer orchestration**. Long-running negotiation loops (quote → approval → PO) use the **Medusa workflow engine** (async, durable state machine), not Server Actions (which are request-response, not workflow-native). This ADR makes the distinction explicit so future developers do not conflate UI mutations (Server Actions) with business orchestration (Medusa workflows).

## Context

The `apps/storefront/` (Next.js 15.5+) serves two personas:

- **Buyer-employee**: logs in, adds items to cart, submits quote request, views approval status
- **Admin/sales-manager**: reviews pending quotes, approves/rejects, manages company + employees

B2B workflows require structured state transitions (quote requested → approved → PO generated) that persist across multiple request/response cycles. Two architectural patterns are viable:

1. **Client-side fetch to REST API** — frontend calls `POST /quotes/request` directly; CSRF token must be explicit; auth context flows via headers or cookies
2. **Next.js Server Actions** — frontend calls a function marked `"use server"`; CSRF is implicit (Next.js middleware); cookies pass automatically; state is validated on the server boundary
3. **Separate orchestration layer** (GraphQL or tRPC) — adds indirection; unnecessary for B2B scope

**Phase 1 reality** (verified in `apps/storefront/src/modules/account/components/`): 23 B2B account UI components exist (approval-card, company-card, employees-card, quote-card, etc.). These components call backend state mutations; the pattern must be consistent across all 23.

The Medusa workflow engine (`apps/backend/src/workflows/{quote,approval,order}/`) handles durable state (8 quote workflows + 4 approval workflows verified). Server Actions in the storefront are a thin client-side wrapper; the orchestration lives in Medusa.

## Decision

**Use Next.js Server Actions for storefront B2B mutations.** Specifically:

- **Quote operations** — `apps/storefront/src/lib/data/quotes.ts` exports `createQuote`, `fetchQuotes`, `fetchQuote` (Server Actions with `"use server"` directive). Each calls Medusa `/store/quotes` with cart_id + auth headers.
- **Quote messaging** — Server Action helper wraps the `createQuoteMessage` workflow (see [ADR-008](./adr-008-medusa-modules-reuse-vs-new.md) quote workflows list); buyer-employee and admin/sales-manager both post messages via the same surface.
- **Approval operations** — handled in the Medusa admin SDK (`apps/backend/src` admin extension), NOT the storefront. The storefront surfaces approval STATE to buyer-employees via the 23 B2B account UI components.

**Auth / CSRF enforcement**:

- Next.js middleware validates `Authorization: Bearer <token>` header (or cookies) on every Server Action call
- CSRF tokens are implicit (Next.js HTTP-only cookies + SameSite=Strict); no manual token passing required
- Company + employee context is resolved from `req.user` after middleware auth; Server Actions cannot execute without auth context

**Long-running workflows stay in Medusa** (not Server Actions):

```typescript
// CORRECT: quote acceptance triggers a workflow (async, durable)
async function approveQuote(quoteId: string) {
  const result = await medusaClient.admin.workflows.execute('customer-accept-quote', {
    quote_id: quoteId,
    approver_id: req.user.id,
  });
  return result; // polls until completion or timeout
}

// WRONG: attempting to do approval state machine in a Server Action
// (request-response only, not multi-step durable orchestration)
async function approveQuote(quoteId: string) {
  // ❌ This pattern cannot handle approvals that require async payment processing,
  // ❌ notifications, or approval workflows spanning 10+ steps.
  return db.quotes.update(quoteId, { status: 'approved' });
}
```

## Consequences

**Accepted**:

- Server Actions reduce client-side complexity — no manual CSRF token handling, no manual cookie management.
- Form submissions and mutations are co-located with components (`app/` directory convention); easier to refactor UI+backend together.
- Auth context (req.user) is automatic within Server Actions; no need to fetch session context in a separate hook.
- Built-in error handling: Server-side exceptions surface as client-side errors (with error boundary support in React 19+).

**Trade-offs**:

- Server Actions are request-response only — quote approval workflows that span multiple async steps (send notification → wait for customer response → generate PO) must live in Medusa, not in Server Actions.
- Client-side cache invalidation is manual (no built-in reactivity like tRPC). Mitigation: use `revalidatePath()` after Server Action to trigger a fresh fetch.
- Limited to Next.js framework — if future architecture requires language switching (e.g., Go backend), Server Actions are abandoned in favour of REST API + client-side libraries.

**Rejected**:

- **Client-side fetch + REST API** — requires manual CSRF token handling and cookie-based auth wiring; adds boilerplate compared to Server Actions.
- **tRPC** — adds ~25 KB of client runtime + type-emit toolchain in the storefront build. Type-safety benefit is duplicated by Medusa OpenAPI types (already imported in `apps/storefront/src/types`). Marginal type-safety gain does not justify build-complexity cost at 23 B2B components.
- **GraphQL** — would require a schema-stitch layer over Medusa Admin and Store APIs. The mutation surface is REST-shaped (`POST /store/quotes`, `POST /admin/quotes/:id/approve`) and serves dual personas via separate endpoints — schema unification is unnecessary indirection at v0.3 scope.

## Workflow Distinction (Critical)

Server Actions invoke workflows but do not implement them. The lifecycle is:

1. **Server Action (storefront)**: receives form submission, validates auth, calls Medusa workflow endpoint
2. **Medusa Workflow Engine (backend)**: orchestrates durable state machine (8 quote workflows + 4 approval workflows)
3. **Workflow steps**: trigger notifications, update database, emit events, call external services
4. **Server Action completion**: polls workflow status and returns result to client

Conflating Server Actions with Medusa workflows is the most common mistake in this architecture. Test suite must enforce the separation (storefront tests mock workflow endpoints; workflow tests mock database + external services).

## Cross-References

- [b2b-blueprint.md — Persona Section (buyer + admin journeys)](../b2b-blueprint.md)
- [LEAN-5S-3T.md — 3T testing matrix for E2E coverage](../LEAN-5S-3T.md)
- [discovery-brief.md — Buyer-employee and admin persona journey discovery](../discovery-brief.md)
- ADR-008: Medusa B2B Modules (provide the `quote` and `approval` state machines)
- Phase 1 components: `apps/storefront/src/modules/account/components/` (23 components, verified)
- Workflow implementation: `apps/backend/src/workflows/{quote,approval}/workflows/` (8+4 workflows)
- Next.js documentation: [Route Handlers vs Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
