---
title: "ADR-010: Medusa OOTB Extended"
description: Strategy for extending Medusa out-of-the-box modules via workflows and links without forking core.
sidebar_position: 10
tags: [adr, medusa, workflows, links, extension-pattern]
source_refs:
  - path: "docs/architecture/ADR-010-medusa-ootb-extended.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-010-medusa-ootb-extended.md` to compile full content.</Note>

# ADR-010: Medusa OOTB Extended

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-010-medusa-ootb-extended.md`

Medusa's out-of-the-box modules (cart, order, product, customer) are extended via **links** (`src/links/`) and **workflows** (`src/workflows/`) in the plugin. Core modules are never forked. New B2B-specific data models (`company`, `quote`, `approval`) are standalone modules registered in `medusa-config.ts`.
