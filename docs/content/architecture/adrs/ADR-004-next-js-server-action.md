---
title: "ADR-004: Next.js Server Actions"
description: Next.js 15 Server Actions are used for B2B form mutations instead of dedicated API routes.
sidebar_position: 4
tags: [adr, nextjs, frontend, server-actions]
source_refs:
  - path: "docs/architecture/ADR-004-next-js-server-action.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-004-next-js-server-action.md` to compile full content.</Note>

# ADR-004: Next.js Server Actions

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-004-next-js-server-action.md`

Next.js 15 App Router Server Actions handle B2B form mutations (quote submission, approval). Co-located with route segments; no separate API gateway layer needed at Phase 1.
