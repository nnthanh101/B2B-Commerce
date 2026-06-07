---
title: "ADR-008: Medusa Modules — Reuse vs New"
description: Decision framework for extending existing Medusa modules vs. creating new custom modules.
sidebar_position: 8
tags: [adr, medusa, modules, company, quote, approval]
source_refs:
  - path: "docs/architecture/ADR-008-medusa-modules-reuse-vs-new.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-008-medusa-modules-reuse-vs-new.md` to compile full content.</Note>

# ADR-008: Medusa Modules — Reuse vs New

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-008-medusa-modules-reuse-vs-new.md`

New custom modules (`company`, `quote`, `approval`) are created for B2B-specific data models. Medusa OOTB modules (cart, order, product, customer) are extended via hooks/workflows, not forked. See [ADR-010](./ADR-010-medusa-ootb-extended.md) for the extension pattern.
