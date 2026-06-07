---
title: "ADR-009: Apps as First-Party Code"
description: apps/backend and apps/storefront are OceanSoft first-party code — not upstream forks to sync.
sidebar_position: 9
tags: [adr, ip, monorepo, upstream, medusa]
source_refs:
  - path: "docs/architecture/ADR-009-apps-as-first-party-not-upstream.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-009-apps-as-first-party-not-upstream.md` to compile full content.</Note>

# ADR-009: Apps as First-Party Code (Not Upstream Forks)

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-009-apps-as-first-party-not-upstream.md`

`apps/backend` and `apps/storefront` are maintained as OceanSoft first-party IP from v0.1.0. No upstream sync with medusajs/dtc-starter or b2b-starter. Medusa framework upgrades are cherry-picked feature work. See [Licensing](../../licensing.md) for attribution.
