---
title: "Flow 04: Spending Limit Enforcement"
description: Buyer attempts a cart that exceeds spending limit — hook blocks the order.
sidebar_position: 5
tags: [demo, flow, spending-limit, buyer, validation]
source_refs:
  - path: "docs/demo/flows/04-spending-limit.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Flow 04: Spending Limit Enforcement

**Persona**: Maria (Buyer-Employee)

**Scenario**: Maria's monthly spending limit is $200 NZD. She adds a Wireless Rechargeable Mouse ($260 total for 2 units) to the cart. The system blocks checkout with: "This order exceeds your spending limit. Please contact your manager for approval." The button is disabled. Maria cannot proceed — policy enforced before submission, not at approval.

**Status**: ✅ GREEN

**Duration**: ~2 min

*Demo video for this flow is being re-captured.*

## Script (voice narration)

**[00:05]** "Spending Limit Enforcement blocks over-policy purchases before submission."

**[00:14]** "Maria's spending limit is $200 NZD per month. She adds a Wireless Rechargeable Mouse to her cart."

**[00:23]** "The cart total is $260 for 2 units. This exceeds her limit of $200."

**[00:32]** "An orange banner appears: 'This order exceeds your spending limit. Please contact your manager for approval.'"

**[00:40]** "The checkout button is disabled — 'Spending Limit Exceeded.' Maria cannot proceed without manager intervention."

**[00:48]** "No surprises. No rejections at approval. Policy enforced at the moment of decision."
