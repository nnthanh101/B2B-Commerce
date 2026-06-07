---
title: "Flow 05: Quote Negotiation"
description: Sales manager negotiates price on a quote via message thread before approving.
sidebar_position: 6
tags: [demo, flow, quote, negotiation, sales-manager]
source_refs:
  - path: "docs/demo/flows/05-quote-negotiate.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Flow 05: Quote Negotiation

**Persona**: Priya (Sales Manager)

**Scenario**: Maria submits a quote for 500 units at list price. Priya sees it on her dashboard, clicks to open, and counters with a 15% volume discount. The message thread stays live. Maria receives the counter, reviews the new total ($12,750 instead of $15,000), and approves it. One-platform negotiation. Deal closed in two messages, not 20 emails.

**Status**: ⚠️ **EXCLUDED** — Admin quotes page route issue; feature code-complete, visual layer blocked

**Duration**: ~2 min

## Script (voice narration — partial, green-slice only)

**[00:08]** "Quote Negotiation lets sales managers counter-offer and track all messages in one thread."

**[00:16]** "Priya receives Maria's quote for 500 units at $30 each."

**[00:23]** "She clicks Counter Offer and proposes a 15% volume discount: $25.50 per unit."

**[00:31]** "Maria sees the counter and accepts it instantly — visual confirmation blocked pending route fix."

**[00:38]** "Backend negotiation flow is green; storefront route and messaging UI are in the next phase."
