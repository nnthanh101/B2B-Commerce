---
title: "ADR-003: Anthropic Direct API"
description: B2B-Commerce uses Anthropic's API directly (not through AWS Bedrock) for ADLC agent calls.
sidebar_position: 3
tags: [adr, anthropic, ai, claude, adlc]
source_refs:
  - path: "docs/architecture/ADR-003-anthropic-direct-api.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-003-anthropic-direct-api.md` to compile full content.</Note>

# ADR-003: Anthropic Direct API

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-003-anthropic-direct-api.md`

B2B-Commerce uses Anthropic's API directly for ADLC agent orchestration. AWS Bedrock Claude access is a v0.5+ roadmap option. Direct API enables the newest models immediately without Bedrock region availability lag.

## Cross-References

- [ADR-014](./ADR-014-adlc-subagent-governance.md) — ADLC Subagent Governance
