---
title: "Flow 11: Invite Employee"
description: Admin invites a new employee to a buyer company, setting role and spending limit.
sidebar_position: 12
tags: [demo, flow, invite, employee, admin, company]
source_refs:
  - path: "docs/demo/flows/11-invite-employee.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Flow 11: Invite Employee

**Persona**: David (Admin)

**Scenario**: David needs to onboard a new procurement specialist, Sarah. He navigates to Company → Employees, clicks Invite, enters Sarah's email, sets her role (Buyer) and monthly spending limit ($2,000 NZD), and clicks Send. The system generates an invite token and sends a link (email delivery in progress). Sarah opens the token link, sets a password, and accepts. She is now an active team member with her own spending limit and account.

**Status**: ⚠️ **GAP-006 (Email Delivery Deferred)** — Token-accept flow is green; SES integration pending

**Duration**: ~2 min

![Invite employee form — green token-accept path](pathname:///img/demo/flows/11-invite-employee/step-01-invite-form.png)

<video controls preload="metadata" style={{maxWidth:'800px'}} src="/video/demo/flows/11-invite-employee.mp4"></video>

## Script (voice narration)

**[00:09]** "Invite Employee lets admins enroll new team members without manual user creation."

**[00:17]** "David navigates to the company Employees page and clicks Invite New Member."

**[00:26]** "He enters Sarah's email and sets her spending limit to $2,000 NZD, then clicks Send Invite."

**[00:34]** "The system generates a unique invite token. Sarah opens the Accept Invite page, sets a password."

**[00:42]** "She clicks Accept Invite. Her account is created and linked to the company — Ready."

**[00:52]** "Token-accept flow is complete and green. Email delivery (SES) is in progress."
