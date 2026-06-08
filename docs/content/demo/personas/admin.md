---
title: "Persona: Admin"
description: Admin persona playbook — company and quote management from the Medusa admin UI.
sidebar_position: 2
tags: [demo, persona, admin, merchant]
source_refs:
  - path: "docs/demo/personas/admin.md"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
---

# Persona: David (Admin)

**Role**: Procurement director / company admin — governs team membership, spending limits, and approval decisions.

David is a procurement director at an enterprise B2B buyer (Demo Corp, NZ). He oversees a 40-person procurement team, manages company spend policies, approves quotes above threshold, and maintains audit logs for compliance. His pain: approving quotes via email creates audit gaps (no timestamp, no comment trail), and managing team members — roles, spending limits, invite tokens — requires repeated support tickets.

**What David cares about**: Audit trails (every approval decision timestamped and commented), delegation (approve or reject in one click from his dashboard), and team governance (roles and limits without filing IT tickets).

**What he avoids**: An email-approval chain that leaves no audit record; manually creating user accounts for new team members; discovering a policy breach only after an order ships.

**Key capability he unlocks**: One-click quote approval with inline comment and instant buyer notification; self-service company and employee management; token-based employee invite with role and spending-limit pre-set; full audit log for compliance.

## Flow Narration Cue Table

Each row maps to a real flow file. Narration lines are outcome-framed, not feature-tour.

| Flow | Trigger action | Expected on-screen content | Narration line | Flow file |
|------|---------------|---------------------------|----------------|-----------|
| 02 | David opens Maria's pending quote ($850, 12 items); types "Approved. Within Q4 office supplies budget." and clicks Approve | Maria gets instant notification: "Quote Approved"; audit log shows: Approved by David, 14-Jun-2026 10:34am, comment recorded | "David avoids an email approval gap — every decision gets a timestamp, a comment, and an instant buyer notification; the audit log is compliance-ready." | [Flow 02: Approval Workflow](../flows/02-approval.md) |
| 03 | David navigates to Company Settings, clicks Add Employee, enters Sarah's email, sets role (Employee) and monthly limit ($2,000 NZD), saves | Invite token generated; Sarah shown in team roster with role and spending limit visible | "David avoids a support ticket — he adds Sarah, sets her $2,000 limit, and the system handles the invite; no IT help needed." | [Flow 03: Company Management](../flows/03-company-mgmt.md) |
| 11 | David navigates to Company → Employees, clicks Invite New Member, enters Sarah's email, sets spending limit ($200 NZD), clicks Send Invite | Token generated; Sarah opens Accept Invite page, sets password, account created and linked to company | "David avoids manual user creation — the invite token flow onboards Sarah in two clicks; email delivery (SES integration) is in progress." | [Flow 11: Invite Employee](../flows/11-invite-employee.md) |

## CEO-Reel Pilot Depth (the approval resolution, Flow 02)

> **Reel role**: David is the GOVERNANCE protagonist of the CEO reel's resolution beat. Maria triggers the value (Cart → Quote); David closes the loop (Approval with audit trail). He is NOT a feature tour — he is the "minutes, not days, AND on the record" payoff. Evidence-bound to Flow 02 (✅ GREEN). [product:write-stories]

**JTBD**: "When a buyer's quote lands in my queue, I need to approve or reject it in one click with a comment that becomes a permanent, timestamped audit record — so I close the decision in minutes and pass any compliance review later."

**Pains → Gains** (the outcome the CEO must *feel*):

| Pain (today, email approval) | Gain (on screen, provably-green) |
|------------------------------|----------------------------------|
| Approve-by-email = no timestamp, no comment trail, audit gaps | Audit log: "Approved by David, 14-Jun-2026 10:34am" + comment recorded (Flow 02) |
| Buyer waits, re-pings "did you approve?" | Maria gets an instant "Quote Approved" notification the moment David clicks |
| Policy breach found only after an order ships | Quote shows $850 under-policy before David approves; governed by design |

**Success metric (measured, NOT forecast)**: every approval decision in the reel carries a visible approver name + timestamp + comment on screen (audit completeness = 100% of fields populated); buyer notification is instant (state flips to "Approved" within the reel).

**5W1H (David)**:
- **Who**: David, procurement director / company admin, Demo Corp NZ; the governance owner.
- **What**: Open Maria's $850 pending quote, comment, and approve in one click.
- **When**: Immediately after Maria submits — the reel's resolution beat.
- **Where**: Approvals dashboard → pending-quote detail (Flow 02 step-01 / approvals-page screens).
- **Why**: Email approvals leave audit gaps; one-click + comment + timestamp is compliance-ready.
- **How**: Type comment "Approved. Within Q4 office supplies budget." → click Approve → audit log records it, Maria notified.

**Flows/screens this persona drives in the pilot**: Flow 02 (approvals-dashboard → pending-quote → comment+approve → audit-log entry); receives the handoff from Maria's Flow 01.

## Cross-References

- [Persona Flow Map](../persona-flow-map.md) — machine-readable flow ownership contract
- [Demo Storyboard](../storyboard.md) — 3-Act scene breakdown
