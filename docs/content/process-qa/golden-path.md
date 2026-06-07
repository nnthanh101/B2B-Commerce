---
title: Golden Path
description: The canonical 15-minute demo walkthrough proving the B2B quote-assisted workflow with dual-persona.
sidebar_position: 2
tags: [demo, golden-path, quickstart, buyer, admin, quote, approval]
source_refs:
  - path: "docs/golden-path.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run <code>/commerce:docs-ingest docs/golden-path.md</code> to compile full content.</Note>

# Golden Path — Demo B2B-Commerce End-to-End in 15 Minutes

> **Doc identity**: This is the **Golden Path** — the canonical happy-path demo that proves the wedge (quote-assisted B2B with dual-persona). If you only read one B2B-Commerce doc to evaluate the product, read this one.
> **Audience**: HITL, prospect demo, alpha customer OceanSoft, first-week dev
> **Time**: 5 min setup + 10 min Golden Path demo = 15 min total
> **Phase**: 1 (local-first, no AWS provisioning)
> **Companion docs**: [Quickstart](../quickstart.md) · [Local MVP Topology](../architecture/local-mvp.md) · [Discovery Brief](./discovery-brief.md)

## Source Document

Full Golden Path walkthrough is in `docs/golden-path.md`. Run `/commerce:docs-ingest docs/golden-path.md` to compile the full 15-step walkthrough into this page.

## Quick Summary

1. **Setup** (5 min): `task up` → verify 4 containers running → `task seed`
2. **Buyer demo** (5 min): login as buyer-employee → browse catalog → add to cart → request quote
3. **Admin demo** (5 min): login as sales manager → review quote → negotiate price → approve → buyer sees PO

## Cross-References

- [Quickstart](../quickstart.md) — Prerequisites and verification
- [B2B Blueprint](../b2b-blueprint.md) — Persona journeys in full
- [Demo Flows](../demo/) — Individual flow playbooks
