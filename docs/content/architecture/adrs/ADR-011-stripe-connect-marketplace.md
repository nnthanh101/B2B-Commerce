---
title: "ADR-011: Stripe Connect Marketplace"
description: Stripe Connect is the payment infrastructure for multi-supplier B2B marketplace payments.
sidebar_position: 11
tags: [adr, stripe, payments, marketplace, phase-2]
source_refs:
  - path: "docs/architecture/ADR-011-stripe-connect-marketplace.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-011-stripe-connect-marketplace.md` to compile full content.</Note>

# ADR-011: Stripe Connect Marketplace

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-011-stripe-connect-marketplace.md`

Stripe Connect (Express accounts) handles multi-supplier marketplace payments. PO-to-Invoice workflow: quote approved → order created → Stripe Connect PaymentIntent → fulfillment. Phase 1 uses Stripe test mode. Real payments deferred to Phase 2 (v0.2).
