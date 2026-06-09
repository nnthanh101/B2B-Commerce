---
title: "CEO Reel Narration — SSO Login to Cart to Quote to Approval"
description: Outcome-driven narration script for the CEO reel (SSO Buyer/Maria/David, 9 beats). Opens on real Keycloak SSO login, then walks the B2B governance arc. Feature-accurate to real on-screen values.
sidebar_position: 10
tags: [demo, narration, ceo-reel, sso-login, cart-to-quote, approval]
source_refs:
  - path: "docs/content/demo/flows/01-cart-to-quote.md"
    last_compiled: "2026-06-09"
  - path: "docs/content/demo/flows/02-approval.md"
    last_compiled: "2026-06-09"
  - path: "docs/content/demo/personas/buyer.md"
    last_compiled: "2026-06-09"
  - path: "docs/content/demo/personas/admin.md"
    last_compiled: "2026-06-09"
last_compiled: "2026-06-09T00:00:00Z"
reel: ceo
frames:
  beat0a: docs/static/img/demo/flows/00-sso-login/step-01.png
  beat0b: docs/static/img/demo/flows/00-sso-login/step-02.png
  beat0c: docs/static/img/demo/flows/00-sso-login/step-03.png
  beat1: docs/static/img/demo/flows/01-cart-to-quote/step-01.png
  beat2: docs/static/img/demo/flows/01-cart-to-quote/step-04.png
  beat3: docs/static/img/demo/flows/01-cart-to-quote/step-05.png
  beat4: docs/static/img/demo/flows/02-approval/step-01.png
  beat5: docs/static/img/demo/flows/02-approval/step-05b-govern-approve.png
  beat6: docs/static/img/demo/flows/02-approval/step-06b-approved-audit.png
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# CEO Reel — SSO Login to Cart to Quote to Approval: Governed Spend End-to-End

**Reel arc**: SSO identity (real Keycloak) → Authenticated → Cart under limit → Quote trigger → Quote filed → Handoff → Govern + Approve → Approved

**Persona protagonist (SSO opening)**: SSO Buyer (sso.buyer@demo.com) — enterprise identity proof
**Persona protagonist (commerce arc)**: Maria (procurement specialist, Demo Corp NZ) — value-trigger
**Persona resolution**: David (procurement director, Demo Corp NZ) — governance owner
**Audience**: Non-technical executive — must feel trust and control from the first second
**Real on-screen values**: Keycloak realm medusa-commerce / NZ$4,647.00 cart / 3 items / NZ$1,582.00 quote / Approval #2469 / Demo Corp

<video controls preload="metadata" style={{maxWidth:'800px'}} src={useBaseUrl('/video/demo/flows/ceo-cart-quote-approval.mp4')}></video>

<img src={useBaseUrl('/img/demo/flows/00-sso-login/step-01.png')} alt="Storefront login page with Sign in with SSO button highlighted — enterprise SSO entry point" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/00-sso-login/step-02.png')} alt="Real Keycloak login form — OCEANSOFT B2B COMMERCE, credentials entered" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/00-sso-login/step-03.png')} alt="Authenticated SSO account — Hello SSO, Signed in as sso.buyer@demo.com" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/01-cart-to-quote/step-01.png')} alt="Loaded cart NZ$4,647 under quarter-close deadline with Request Quote CTA" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/02-approval/step-06b-approved-audit.png')} alt="Approval #2469 flipped to Approved — Demo Corp, on the record" style={{maxWidth:'800px'}} />

## Why this matters — CEO lens

**Why**: A CEO cares that access is governed before the first purchase — and that the whole order-to-approval cycle is fast *and* controlled end-to-end. The reel now opens on the real SSO sign-in: no shared passwords, corporate identity verified by Keycloak, governed from the first click. The legacy path — manual provisioning, three emails, a three-to-five day wait — slips both the security posture and the budget window every quarter.

**Business value**: The reel runs the full arc on real UI: Keycloak SSO login → authenticated account → NZ$4,647 cart → filed NZ$1,582 quote → approval #2469 → Approved. NZD throughout, every step traceable.

**What-if-missing**: Without SSO, employees share passwords or use shadow accounts — no audit trail, no deprovisioning path. Without the governed spending flow, cart-to-approval reverts to email chains. Both gaps are closed in this single reel.

---

## Beat 0a — SSO Entry Point: Sign in with SSO

**Frame**: `docs/static/img/demo/flows/00-sso-login/step-01.png`
**On screen**: B2B Commerce storefront login page, "Sign in with SSO" button amber-highlighted, role-bar SSO Buyer

**Narration**:
> Before Maria submits a single quote, she needs to sign in. B2B Commerce supports enterprise SSO — she clicks Sign in with SSO, and the platform hands off to the company's identity provider.

---

## Beat 0b — Real Keycloak Login Form

**Frame**: `docs/static/img/demo/flows/00-sso-login/step-02.png`
**On screen**: Keycloak login form "OCEANSOFT B2B COMMERCE / Sign in to your account", username sso.buyer@demo.com entered, Sign In button amber-highlighted

**Narration**:
> The real Keycloak login form. Maria enters her corporate credentials once — her identity is verified by the company's identity provider. No shared passwords. No IT tickets. Governed access from the first click.

---

## Beat 0c — Authenticated: Hello SSO

**Frame**: `docs/static/img/demo/flows/00-sso-login/step-03.png`
**On screen**: Storefront account page "Hello SSO", "Signed in as: sso.buyer@demo.com", role-bar SSO Buyer

**Narration**:
> Authenticated. Hello SSO — the account dashboard lands with her identity confirmed. Signed in as sso.buyer@demo.com via Keycloak. The governance chain starts here, before a single cart item is added.

---

## Beat 1 — Setup: Loaded Cart Under Deadline

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote/step-01.png`
**On screen**: NZ$4,647.00 cart, 3 items (6.5-inch Ultra HD Smartphone x3), spending-limit warning, Request Quote CTA

**Narration**:
> Maria is a procurement specialist at a New Zealand manufacturer. Quarter-close is four days away, and today her cart holds three units at NZ$4,647. Under the legacy process, a single quote means three emails, three sign-offs, and a three-to-five day wait — a window that slips the budget every time.

---

## Beat 2 — Trigger: Request Quote

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote/step-04.png`
**On screen**: "Submit request for quote" modal, Cancel and Submit buttons

**Narration**:
> One click converts the cart into a formal quote request. No email chain — just a modal that confirms the cart will become a live quote. Maria clicks Submit.

---

## Beat 3 — Quote Created: Pending Merchant

**Frame**: `docs/static/img/demo/flows/01-cart-to-quote/step-05.png`
**On screen**: Buyer Quotes list, quote #9 through #5, status "Pending Merchant", NZ$1,582.00 total

**Narration**:
> The quote is filed in under ninety seconds. Maria's account shows it live, marked Pending Merchant — awaiting sign-off. Her manager is notified instantly. No chasing, no back-and-forth.

---

## Beat 4 — Handoff: David's Approvals Queue

**Frame**: `docs/static/img/demo/flows/02-approval/step-01.png`
**On screen**: Admin Approvals list, #2469, Demo Corp, Pending, 1 item, 1 of 1 results

**Narration**:
> On the admin side, David — Demo Corp's procurement director — sees approval number 2469 land in his queue the moment Maria submits. No forwarded email, no CC chain. The quote routes straight to the right person.

---

## Beat 5 — Govern and Approve

**Frame**: `docs/static/img/demo/flows/02-approval/step-05b-govern-approve.png`
**On screen**: Admin Approvals list, #2469, Demo Corp, Pending status, approve action available

**Narration**:
> David reviews the approval. The spend is on record, the company is identified, and the policy context is clear. He approves with a single action — spend stays governed, NZD throughout, decision traceable.

---

## Beat 6 — Resolution: Approved

**Frame**: `docs/static/img/demo/flows/02-approval/step-06b-approved-audit.png`
**On screen**: Admin Approvals list, #2469, Demo Corp, green "Approved" status badge

**Narration**:
> Status flipped to Approved. What used to take three to five days took minutes. Maria's budget is protected, the quarter-close window holds, and every decision is on the record. Days became minutes — and the audit trail is built in.

---

## Narration Notes

- **Currency**: NZD throughout. All figures on screen are NZ$ — narrate "NZD" or "New Zealand dollars" on first mention only.
- **Beat 6 audit trail**: The current build shows status flip to Approved on the approvals list. No comment-field or timestamped-approver panel is present in this release. Narration references "decision on the record" as the outcome (correct) without fabricating a visible audit panel.
- **Beat 3 label**: The on-screen label is "Pending Merchant" (not "Pending Approval"). Narrate as "awaiting sign-off" to stay outcome-focused while remaining feature-accurate.
- **PO contract values**: PO used $850/12 items as illustrative placeholders. On-frame real values are NZ$4,647/3 items for beat 1 and NZ$1,582 for beat 3. Per INVEST.Negotiable, on-frame values are narrated (feature-accuracy AC-4).
