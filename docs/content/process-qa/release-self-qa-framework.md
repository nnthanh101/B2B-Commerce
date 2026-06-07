---
title: Release Self-QA Framework
description: Standard operating procedure for release QA — sections A-F, test pyramid, and HITL approval gates.
sidebar_position: 4
tags: [qa, release, testing, playwright, e2e, process]
source_refs:
  - path: "docs/release-self-qa-framework.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run <code>/commerce:docs-ingest docs/release-self-qa-framework.md</code> to compile full content.</Note>

# Release Self-QA Framework (RSF)

> **Version**: 1.1.0 — first run: B2B-Commerce v1.1.0
> **Owner**: HITL + enterprise-team AI agents (ADLC v1.2.0)
> **Authority**: `tmp/B2B-Commerce/coordination-logs/product-owner-2026-06-04-v110-rsf.json` + `cloud-architect-2026-06-04-v110-rsf.json` (PO 96% / CA 96%)
> **Invocation**: `/commerce:release-qa` or `task test:all`

## Source Document

Full RSF with Sections A-F, test pyramid, DORA gates, and evidence paths is in `docs/release-self-qa-framework.md`. Run `/commerce:docs-ingest docs/release-self-qa-framework.md` to compile.

## Quick Reference

```bash
task test:all         # Run full test suite (needs Docker up)
task test:e2e         # Playwright E2E smoke tests
task test:unit        # Unit tests via pnpm turbo
task lint             # ESLint + Prettier
task tf:validate      # Terraform syntax check
```

## Gates

| Gate | Target | Evidence |
|------|--------|----------|
| E2E smoke | All scenarios pass | `tmp/B2B-Commerce/test-results/playwright-report/` |
| Unit coverage | ≥70% | `tmp/B2B-Commerce/test-results/coverage/` |
| Terraform validate | exit 0 | `tmp/B2B-Commerce/test-results/tf-validate.json` |
| Infracost | All FOCUS tags present | `tmp/B2B-Commerce/test-results/infracost-breakdown.json` |

## Cross-References

- [Dev Workflow Hooks](./dev-workflow-hooks.md) — ADLC hook constraints
- [Readiness Scorecard](./readiness-scorecard.md) — GTM readiness gates
