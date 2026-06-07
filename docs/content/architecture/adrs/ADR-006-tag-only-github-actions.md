---
title: "ADR-006: Tag-Only GitHub Actions CI"
description: GitHub Actions workflows only trigger on git tags (not branch pushes) to prevent runaway CI costs.
sidebar_position: 6
tags: [adr, github-actions, ci-cd, oidc, terraform]
source_refs:
  - path: "docs/architecture/ADR-006-tag-only-github-actions.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run `/commerce:docs-ingest docs/architecture/ADR-006-tag-only-github-actions.md` to compile full content.</Note>

# ADR-006: Tag-Only GitHub Actions CI

**Status**: Accepted
**Date**: 2026-06-04
**Source**: `docs/architecture/ADR-006-tag-only-github-actions.md`

CI workflows trigger only on `v*` git tags and PR `main` merges. Branch push CI is disabled to control GitHub Actions minutes. S3-native lock (`use_lockfile`, no DynamoDB) + OIDC role (no long-lived credentials). Related to [ADR-015](./ADR-015-local-first-terraform-iac.md).
