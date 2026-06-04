# ADR-011: Stripe Connect Express for Marketplace Payments (Phase 2 v0.4)

**Status**: Accepted (Roadmap — Phase 2 v0.4)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`

## Summary

Digital-Commerce will use **Stripe Connect Express** as the payment infrastructure for the multi-supplier marketplace at **Phase 2 v0.4**. Phase 1 ships **no payment integration** (mock provider only, per [b2b-blueprint.md](../b2b-blueprint.md) B2B Features Matrix). Phase 2 v0.3 introduces **single-supplier billing** (OceanSoft as merchant of record); Phase 2 v0.4 introduces **multi-supplier marketplace splits** via Connect Express. KYB / KYC is delegated to Stripe; the ANZ-specific supplier vetting overlay is handled separately (see [ADR-013](./ADR-013-anz-marketplace-supplier-vetting.md)). This ADR documents the strategic choice so v0.4 execution does not revisit the vendor debate.

## Context

The Digital-Commerce marketplace will host **multiple ANZ-based suppliers** (Energy / FSI / Telecom verticals) selling to **buyer-employees at customer companies**. Payment flow requirements:

- **Multi-party splits** — buyer pays once; funds split between supplier + platform fee + tax authority
- **ANZ regulatory posture** — ASIC AFSL exemption for the marketplace operator (funds flow through a regulated payment intermediary, not OceanSoft accounts)
- **KYB at supplier onboarding** — beneficial-owner verification, ABN validation, sanctions screening
- **Audit trail** — APRA CPS 234 §36 evidence for every settlement event
- **Multi-currency** — AUD primary, NZD secondary, USD for cross-border suppliers (rare)
- **Buyer-employee experience** — single payment surface, no choice of payment processor per supplier
- **Admin / sales-manager experience** — Stripe Express dashboard per supplier for settlement visibility

Three primary alternatives were considered:

1. **Stripe Connect (Express accounts)** — Stripe handles KYB, hosted onboarding, settlement; platform retains application fee
2. **Square** — strong in-person ANZ retail, weaker marketplace-splits tooling
3. **Adyen** — enterprise-tier multi-party payments, requires direct contract + minimum volume commitment
4. **Direct bank rail** (NPP / PayTo) — lowest fees, highest KYB operational burden, no marketplace orchestration

## Decision

**Use Stripe Connect Express for multi-supplier marketplace payments at Phase 2 v0.4.** Specifically:

- **Account type**: Express (Stripe-hosted onboarding, KYB delegated, dashboard included) for the default supplier path. Standard accounts available for suppliers that already operate their own Stripe billing relationship and prefer to bring their own account.
- **Phase 1 (current)**: no payments wired. Cart checkout uses a mock provider sufficient for Playwright two-persona smoke test (per [b2b-blueprint.md](../b2b-blueprint.md) DC-020). This avoids PCI scope and Stripe contract paperwork until product-market signal justifies it.
- **Phase 2 v0.3**: single-supplier billing — OceanSoft as merchant of record; standard Stripe `payment_intents` API; no Connect platform.
- **Phase 2 v0.4**: multi-supplier marketplace — Connect Express accounts per supplier; `application_fee_amount` on each `payment_intent`; settlement to supplier's Express account; Stripe Express dashboard available to admin / sales-manager (supplier side).
- **KYB / KYC**: delegated to Stripe. ANZ-specific supplier vetting overlay (ABN reputation checks, ANZ Modern Slavery Act §16 disclosure, industry-specific compliance docs) is handled by the supplier-vetting workflow per [ADR-013](./adr-013-anz-marketplace-supplier-vetting.md). Stripe KYB is necessary but not sufficient.
- **Webhooks**: `payment_intent.succeeded`, `account.updated`, `transfer.created` consumed by Medusa subscribers under `apps/backend/src/subscribers/` for settlement reconciliation.

### FOCUS 1.2+ Tag Set (Payment Infrastructure)

Per [b2b-blueprint.md](../b2b-blueprint.md) FinOps strategy, payment infrastructure carries the full 9-key tag set at Phase 2:

- `Service=digital-commerce-payments`
- `Environment={dev,staging,prod}`
- `Owner=cloudops`
- `CostCenter=engineering`
- `Project=digital-commerce`
- `BillingTag={customer-X}` — per multi-tenant operator (v1.0)
- `ManagedBy=terraform` for infra, `stripe-managed` for Connect accounts
- `Compliance=APRA-CPS234+PCI-DSS`
- `DataClassification=customer-financial`

### ANZ Regulatory Context

- **ASIC AFSL exemption** — Stripe holds the Australian payment-services licensing; OceanSoft as platform operator is exempt under the marketplace-operator carve-out. Stripe's contract reserves funds-flow responsibility.
- **APRA CPS 234 §36 audit trail** — every `payment_intent` / `transfer` event is persisted to Postgres via webhook (matches the workflow-step persistence pattern of [ADR-002](./adr-002-rds-single-az.md)).
- **AUSTRAC reporting** — Stripe handles threshold transaction reports for AUD volumes; OceanSoft retains corresponding event log for cross-reference.
- **Modern Slavery Act §16** — supplier disclosure flow captured at vetting (ADR-013), referenced from the Connect Express onboarding link.

## Consequences

**Accepted**:

- **Buyer-employee** sees a single payment surface — Stripe-hosted checkout for the cart, regardless of how many suppliers fulfilled it. No payment-processor choice at checkout.
- **Admin / sales-manager** (supplier side) receives a Stripe Express dashboard for settlement visibility — no need to build a custom settlement UI in v0.4.
- KYB operational burden is delegated; OceanSoft does not become an AML-regulated entity.
- Multi-currency support is included (AUD primary, NZD/USD where supplier configured).
- Standard Stripe Connect Express fee (~0.25% platform fee on top of base Stripe fees) is transparent and pass-through to suppliers.

**Trade-offs**:

- Stripe Express dashboards are Stripe-branded; cannot be fully whitelabeled. Acceptable: supplier-facing only; buyer-employee never sees Stripe branding in storefront.
- Application-fee model is bound to Stripe pricing; if Stripe raises platform fees, OceanSoft margin compresses. Mitigation: Phase 2 v0.4 includes Square / Adyen evaluation as a fallback contingency (no commitment).
- Cross-border (USD) supplier onboarding requires additional Stripe documentation — handled at supplier-vetting workflow (ADR-013).

**Rejected**:

- **Square** — ANZ marketplace tooling weaker than Stripe Connect; in-person retail strength irrelevant to digital-commerce B2B procurement.
- **Adyen** — enterprise-tier minimum-volume commitments destroy Phase 2 v0.4 cost predictability. Reassess at v1.0 if customer volume justifies.
- **Direct bank rail (NPP / PayTo)** — KYB operational overhead destroys the time-to-launch budget; no marketplace-splits orchestration provided by Australian bank APIs. Reassess at v1.0+ if fees become a binding constraint.

## Cross-References

- [ADR-013: ANZ Marketplace Supplier Vetting](./ADR-013-anz-marketplace-supplier-vetting.md) — KYB / KYC overlay companion
- [ADR-002: RDS PostgreSQL Single-AZ](./ADR-002-rds-single-az.md) — settlement event persistence target
- [b2b-blueprint.md — B2B Features Matrix](../b2b-blueprint.md) — Stripe roadmap row
- [LEAN-5S-3T.md — 3-Tier Testing Matrix (payment integration)](../LEAN-5S-3T.md)
- [discovery-brief.md — Buyer-employee + admin personas at the payment surface](../discovery-brief.md)
