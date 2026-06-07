---
title: "ADR-012: Quote Engine Architecture"
description: The B2B quote engine — state machine, negotiation steps, and approval integration.
sidebar_position: 12
tags: [adr, quote, approval, state-machine, b2b]
source_refs:
  - path: "docs/architecture/ADR-012-quote-engine-architecture.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-012-quote-engine-architecture.md` to compile full content.</Note>

# ADR-012: Quote Engine Architecture

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-012-quote-engine-architecture.md`

The quote engine implements a state machine: `DRAFT` → `PENDING` → `NEGOTIATING` → `APPROVED` / `REJECTED` / `ACCEPTED`. Three modules collaborate: `quote` (data + pricing), `approval` (workflow gates), `company` (spending-limit enforcement). Medusa workflows orchestrate the async steps.
