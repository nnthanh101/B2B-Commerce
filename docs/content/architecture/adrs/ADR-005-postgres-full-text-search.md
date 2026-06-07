---
title: "ADR-005: Postgres Full-Text Search"
description: PostgreSQL built-in FTS is used for product and quote search, avoiding Elasticsearch overhead.
sidebar_position: 5
tags: [adr, postgresql, search, phase-1]
source_refs:
  - path: "docs/architecture/ADR-005-postgres-full-text-search.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-005-postgres-full-text-search.md` to compile full content.</Note>

# ADR-005: Postgres Full-Text Search

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-005-postgres-full-text-search.md`

PostgreSQL `tsvector` / `tsquery` handles product and quote search. Elasticsearch/OpenSearch deferred to v0.5+ when catalog scale justifies it. Current catalog: < 1,000 SKUs.
