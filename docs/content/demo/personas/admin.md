---
title: "Persona: Admin"
description: Admin persona playbook — company and quote management from the Medusa admin UI.
sidebar_position: 2
tags: [demo, persona, admin, merchant]
source_refs:
  - path: "docs/demo/personas/admin.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
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

## Cross-References

- [Persona Flow Map](../persona-flow-map.md) — machine-readable flow ownership contract
- [Demo Storyboard](../storyboard.md) — 3-Act scene breakdown
