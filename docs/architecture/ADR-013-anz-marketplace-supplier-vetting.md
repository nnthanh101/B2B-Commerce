# ADR-013 — ANZ Marketplace Supplier Vetting (3-Layer Model)

| Status | Date | Owner | Phase |
|---|---|---|---|
| Accepted (Roadmap v0.4 activation) | 2026-06-04 | security-compliance-engineer + product-owner | Roadmap v0.4 — zero code today |

## Summary

Marketplace supplier vetting follows a **3-layer model**: (1) **Stripe KYB** at payment-onboarding (delegated under [ADR-011](./ADR-011-stripe-connect-marketplace.md)); (2) **OceanSoft platform overlay** — ASIC company status + ANZ business registration + ANZSIC industry code + DFAT/UN sanctions screening — at supplier-account creation; (3) **ongoing periodic re-verification** (annual + event-triggered). The pattern activates at Phase 2 v0.4 (multi-supplier marketplace). Phase 1 and v0.3 ship single-supplier (OceanSoft as merchant of record) with no vetting overhead.

## Context

ANZ Energy / FSI / Telecom buyers conduct **procurement audits** before onboarding a marketplace. They ask one question: *"How do you vet your suppliers?"* A clear, regulator-defensible answer is the **unfair advantage** for OceanSoft's alpha customers and licensees.

The marketplace operator (OceanSoft) has obligations under:

- **APRA CPS 234 §36** — information security audit trail for third-party arrangements; 7-year retention
- **APRA CPS 230** (effective Q3 2026 for relevant entities) — operational risk management for third-party suppliers; OceanSoft's regulated customers will inherit this requirement
- **ASIC** (Australian Securities & Investments Commission) — RG 277 Information Sheet on platform operators; AFSL **not required** when Stripe handles funds flow (the model in [ADR-011](./ADR-011-stripe-connect-marketplace.md))
- **AUSTRAC** AML/CTF Act 2006 — designated services obligations; **delegated to Stripe** for KYC/CDD under Stripe Connect AU compliance posture
- **Australian Consumer Law (ACL)** (Schedule 2 of *Competition and Consumer Act 2010*) — platform must take reasonable steps for supplier representations; warranty pass-through to buyer-employee

5S Sort discipline (why this ADR exists at all):
- **Problem solved**: explicit vetting story for Energy/FSI/Telecom procurement audits
- **What breaks without it**: ad-hoc supplier onboarding fails enterprise audits; OceanSoft cannot defend supplier-vetting posture; APRA CPS 234 §36 audit trail is missing
- **Why not extend existing**: [ADR-011](./ADR-011-stripe-connect-marketplace.md) covers payment rail; [ADR-008](./ADR-008-medusa-modules-reuse-vs-new.md) covers module reuse; [ADR-009](./ADR-009-apps-as-first-party-not-upstream.md) covers IP ownership — none address regulator-defensible supplier vetting

## Decision

### Layer 1 — Stripe KYB (delegated, Phase 2 v0.4)

Stripe Connect Express collects supplier identity, business registration, beneficial ownership (Stripe-controlled flow). OceanSoft platform receives the `account.updated` webhook on KYB pass/fail. Stripe handles AUSTRAC AML/CTF supplier identification per its AU compliance posture. OceanSoft does **not** re-implement KYC.

### Layer 2 — OceanSoft Platform Overlay (Phase 2 v0.4)

| Check | Source | Output |
|---|---|---|
| ASIC company status | `connectonline.asic.gov.au` ABN/ACN lookup | status must equal `Registered` |
| ABN / GST registration | Australian Business Register (ABR) free API | valid + active GST flag |
| ANZSIC industry code | supplier self-declared; mapped to internal category taxonomy | category must be in Energy/FSI/Telecom-compatible list |
| Sanctions screening | DFAT consolidated list + UN Security Council list (free-tier APIs); commercial service (ComplyAdvantage / Refinitiv) at scale | no match required |
| ACL supplier representations | T&Cs at onboarding | supplier accepts warranty pass-through clause |

- **Storage**: vetting evidence in RDS per [ADR-002](./ADR-002-rds-single-az.md) with FOCUS tags `Compliance=APRA-CPS234`, `DataClassification=supplier-business`
- **Audit trail**: every vetting check writes JSON to `tmp/B2B-Commerce/coordination-logs/supplier-vetting-{supplier_id}-{date}.json` (Phase 1 local), then to an S3-backed immutable audit bucket at v0.4 deploy with Object Lock for the 7-year retention obligation

### Layer 3 — Ongoing Re-verification (Phase 2 v0.4)

- **Annual trigger**: ASIC status re-check + sanctions re-screen on supplier anniversary
- **Event triggers**: transaction volume threshold breach, complaint count exceeded, dispute rate above tolerance — automated re-screen + manual review queue
- **Suspension policy**: failed re-verification → supplier account disabled in Medusa; admin/sales-manager notified via admin SDK notification surface; buyer-employees see supplier-unavailable state at quote-creation time

## Phase 1 + v0.3 reality (honest framing)

| Phase | Status | Vetting scope |
|---|---|---|
| Phase 1 (today) | Single-supplier (OceanSoft as merchant of record) | None required — no third-party suppliers |
| v0.3 (next quarter) | Single-supplier marketplace (OceanSoft only) | None required |
| v0.4 (this ADR activates) | Multi-supplier marketplace | 3-layer model engaged for every new supplier onboarding |

**Zero supplier-vetting code today** — this ADR is roadmap-aligned governance, not built. Marked aspirational consistent with [ADR-014](./adr-014-adlc-subagent-governance.md) read-first / HITL-write discipline.

## FOCUS 1.2+ Tags

- `Service=b2b-commerce-supplier-vetting`
- `Environment={dev,staging,prod}`
- `Owner=security-compliance`
- `CostCenter=engineering`
- `Project=b2b-commerce`
- `BillingTag={customer-X}` (multi-tenant rebilling)
- `ManagedBy=adlc`
- `Compliance=APRA-CPS234+ASIC+AUSTRAC+ANZSIC`
- `DataClassification=supplier-business`

(Full 9-key set per [ADR-001](./adr-001-single-aws-account.md).)

## Dual-Persona View

| Persona | Vetting surface |
|---|---|
| **Buyer-employee** (the spender) | Trusts that listed suppliers passed vetting; sees supplier verification badge in product/quote listings; no exposure to vetting mechanics |
| **Admin/sales-manager** (the approver) | Views supplier vetting status in admin SDK; receives alert on supplier re-verification failure; can suspend supplier |
| **Supplier admin** (Phase 2 v0.4 new persona) | Completes Stripe KYB + OceanSoft platform overlay during onboarding; receives annual re-verification reminders |

## Alternatives Considered

- **Delegate everything to Stripe** — REJECTED. Stripe KYB does not cover ASIC company status or DFAT sanctions list. Buyer-side audits expect OceanSoft to vet, not Stripe.
- **Commercial KYB service** (Persona, Onfido at full integration) — REJECTED for v0.4. Cost not justified for first 5–10 suppliers; ASIC + DFAT free APIs sufficient. Reassess at 50+ suppliers (Layer 2 service swap-out, no architectural change).
- **Manual vetting only** — REJECTED. Does not scale beyond ~10 suppliers; no automated audit trail; APRA CPS 234 §36 expects evidence-producing automation.
- **Self-attestation only** — REJECTED. Buyer-side procurement audits will not accept self-attestation; ACL requires platform reasonable steps for supplier representations.

## ANZ Regulatory Context

| Reg / Authority | Citation | OceanSoft obligation |
|---|---|---|
| APRA | CPS 234 §36 | Information security audit trail for third-party arrangements; 7-year retention |
| APRA | CPS 230 (effective Q3 2026 for relevant entities) | Operational risk management for third-party suppliers |
| ASIC | RG 277 | Platform operator information sheet; AFSL not required under Stripe-funds-flow model |
| AUSTRAC | AML/CTF Act 2006 | Designated services KYC/CDD — delegated to Stripe |
| Consumer | ACL Schedule 2, *Competition and Consumer Act 2010* | Platform reasonable steps for supplier representations; warranty pass-through to buyer-employee |

## Consequences

**Accepted**:
- Vetting story exists for Energy/FSI/Telecom procurement audits — this is the unfair advantage
- Phase 2 v0.4 onboarding adds ~10 min per supplier (Stripe + platform overlay combined)
- Re-verification ops overhead ≈ 30 min/year per supplier; <2 hours/year per 5-supplier cohort

**Trade-offs**:
- ASIC + DFAT free APIs have rate limits; queue-based execution required at scale
- ANZSIC self-declaration accepted in v0.4; manual validation only triggered on category mismatch with quote line items

**Buyer-side audit response** (the question this ADR exists to answer):
> *"All marketplace suppliers pass Stripe KYB, an OceanSoft platform overlay (ASIC company status, DFAT/UN sanctions screening, ANZSIC industry verification, ACL warranty acceptance), and annual + event-triggered re-verification. Evidence is retained for 7 years per APRA CPS 234 §36 in an S3 Object Lock-protected audit bucket."*

## Cross-References

- [ADR-011](./ADR-011-stripe-connect-marketplace.md) — Stripe Connect Express payment rail (Layer 1 dependency)
- [ADR-001](./ADR-001-single-aws-account.md) — APRA CPS 234 region pinning (Layer 2 storage)
- [ADR-002](./ADR-002-rds-single-az.md) — supplier vetting evidence storage (`DataClassification=supplier-business`)
- [ADR-012](./ADR-012-quote-engine-architecture.md) — supplier appears in quote sender side at v0.4
- [ADR-014](./ADR-014-adlc-subagent-governance.md) — ADLC governance pattern (no AI agent autonomously vets; HITL approves marginal cases)
- [b2b-blueprint.md](../b2b-blueprint.md) — ANZ Energy/FSI/Telecom positioning
- [LEAN-5S-3T.md](../LEAN-5S-3T.md) — 5S Sort discipline (this ADR justifies its own existence)
- [discovery-brief.md](../discovery-brief.md) — buyer-side audit defensibility
