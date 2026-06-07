---
title: "ADR-014: ADLC Subagent Governance"
description: Governance model for the 38-agent ADLC team — PO+CA coordination, file-locks, hook enforcement.
sidebar_position: 14
tags: [adr, adlc, governance, agents, hitl, principle-i]
source_refs:
  - path: "docs/architecture/ADR-014-adlc-subagent-governance.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-014-adlc-subagent-governance.md` to compile full content.</Note>

# ADR-014: ADLC Subagent Governance

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-014-adlc-subagent-governance.md`

The ADLC v1.2.0 framework governs 38 specialist AI agents under one HITL manager. Key rules: PO+CA coordination before specialist execution; file-lock per specialist; hook enforcement via `validate-bash.sh` v3.3.0; git mutations are HITL-only (Principle I). Evidence required in `tmp/B2B-Commerce/` for every claim.
