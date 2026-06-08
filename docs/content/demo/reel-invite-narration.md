---
title: "Flow 11 Reel Narration — Invite Employee"
description: Narration script for the invite-employee reel. David invites a new employee via token-based onboarding. 4-beat arc.
sidebar_position: 15
tags: [demo, narration, invite-employee, flow-11, onboarding, governance]
source_refs:
  - path: "docs/content/demo/flows/11-invite-employee.md"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
reel: invite-employee
voice: Daniel
frames:
  beat1: docs/static/img/demo/flows/11-invite-employee/step-01.png
  beat2: docs/static/img/demo/flows/11-invite-employee/step-02.png
  beat3: docs/static/img/demo/flows/11-invite-employee/step-03.png
  beat4: docs/static/img/demo/flows/11-invite-employee/step-04.png
---

# Flow 11 Reel — Invite Employee: Governed Onboarding in Four Steps

**Reel arc**: Invite form → Token confirmation → Accept invite page → Account ready

**Persona protagonist**: David (company admin) — governance owner
**New employee**: Sarah (procurement specialist being onboarded)
**Audience**: C-level or IT admin — "how do I onboard team members without IT tickets?"
**Currency**: NZD — spending limit NZ$200 set during invite
**Voice**: Daniel (en-GB)

---

## Beat 1 — Invite Form: Set Role and Spending Limit

**Frame**: `docs/static/img/demo/flows/11-invite-employee/step-01.png`
**On screen**: Admin Company > Employees > Add Company Customer form — email, spending limit NZD, admin toggle; role-bar David

**Narration**:
> David needs to onboard Sarah, a new procurement specialist. In the admin console, he opens Demo Corp, clicks Add, and fills in Sarah's email and a spending limit of NZ$200. No IT ticket. No manual user creation. The governance parameters are set right here.

---

## Beat 2 — Token Confirmation: Invite Link Generated

**Frame**: `docs/static/img/demo/flows/11-invite-employee/step-02.png`
**On screen**: Employee added, confirmation state or token visible; role-bar David

**Narration**:
> The system generates a secure invite link. David copies it and sends it to Sarah directly — email delivery via SES is in progress. The token is single-use and expires in seven days. No password shared. No access until Sarah accepts.

---

## Beat 3 — Accept Invite: Sarah Sets Her Password

**Frame**: `docs/static/img/demo/flows/11-invite-employee/step-03.png`
**On screen**: Storefront /nz/invite/accept?token=... — set-password form visible; role-bar David

**Narration**:
> Sarah opens the invite link in her browser. She sees the B2B Commerce accept-invite page — a clean form to set her own password. The token was pre-validated server-side. No admin action needed on her side.

---

## Beat 4 — Account Ready: Linked to Company

**Frame**: `docs/static/img/demo/flows/11-invite-employee/step-04.png`
**On screen**: Post-accept state — account created and linked to Demo Corp; role-bar David

**Narration**:
> Sarah's account is created, linked to Demo Corp, with her NZ$200 spending limit already set. She can log in and start purchasing immediately — within the governed limits David configured. Self-service onboarding. Zero back-and-forth.

---

## Narration Notes

- **Email delivery (SES)**: Phase-1 is local-stub only. The backend logs the accept URL to stdout. Narrate "email delivery via SES is in progress" — do NOT show an inbox or received-email frame (GAP-006).
- **Token path**: Capture uses the real token from the POST /store/invites API response. Token is single-use; accept page validates server-side before rendering the set-password form.
- **Beat 4 state**: If post-accept shows success message (not full account dashboard), narrate outcome correctly. Do not fabricate a full account dashboard if not present.
- **Spending limit displayed**: $200 NZD — matches the Add Company Customer form field.
