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

**Scenario**: Maria's monthly limit is $3,000 NZD. She has spent $2,800. She adds a $400 item to the cart. The system shows: "Remaining budget: $200 NZD. This item exceeds your limit by $200." The item locks. Maria removes it, confirms her cart is within budget ($2,900 total), and checks out. Policy enforced. No surprise rejections at approval.

**Status**: ✅ GREEN

**Duration**: ~2 min

![Cart with spending limit warning displayed](pathname:///img/demo/flows/04-spending-limit/generated-spending-limit-01-cart.png)

## Script (voice narration)

**[00:05]** "Spending Limit Enforcement blocks over-policy purchases before submission."

**[00:14]** "Maria browses products and adds items to her cart. Her remaining budget: $200 NZD."

**[00:23]** "She adds a $400 item. The cart shows a warning: 'Remaining: $200. This item exceeds limit.'"

**[00:32]** "The item is disabled. Maria can see the overage amount and exact policy constraint."

**[00:40]** "She removes the item and adds a $150 item instead. Total now $2,950. Within limit. Checkout enabled."

**[00:48]** "No surprises. No rejections at approval. Policy enforced at the moment of decision."
