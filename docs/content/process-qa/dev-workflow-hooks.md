---
title: Dev Workflow — ADLC Hook Constraints
description: How validate-bash.sh v3.3.0 works, what it blocks, and approved workarounds for AI-agent development.
sidebar_position: 5
tags: [dev-workflow, hooks, adlc, validate-bash, container-first]
source_refs:
  - path: "docs/dev-workflow-hooks.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run <code>/commerce:docs-ingest docs/dev-workflow-hooks.md</code> to compile full content.</Note>

# Dev Workflow — ADLC Hook Constraints and Workarounds

## What validate-bash.sh does

The ADLC framework ships `validate-bash.sh` v3.3.0 as a **fail-closed** pre-tool hook.
When an AI agent (Claude Code) calls the Bash tool, the hook intercepts the command text
and blocks a broad set of verbs before execution.

**Blocked categories**:
- Package managers: `pnpm`, `npm`, `npx`, `yarn`
- Container runtimes: direct `docker`, `docker compose` invocations
- Git mutations: `git add`, `git commit`, `git push`, `git merge`, etc.
- Shell execution wrappers: `eval`, `bash -c`, `sh -c`, backticks
- AWS mutation verbs: `create-*`, `delete-*`, `modify-*`

**Allowed** (safe-read allowlist):
- `git log`, `git status`, `git diff`, `git show` (read-only git)
- `terraform` via the safe-read subcommand list
- `docker compose ps`, `docker compose logs` (read-only compose)
- Governed binaries with read subcommands

## Source Document

Full workarounds, bypass patterns, and container-first approach are in `docs/dev-workflow-hooks.md`. Run `/commerce:docs-ingest docs/dev-workflow-hooks.md` to compile.

## Key Patterns

| Need | Blocked approach | Approved approach |
|------|-----------------|------------------|
| Install npm packages | `npm install` | `task docs:install` (runs inside node:22 container) |
| Run pnpm commands | `pnpm install` | `docker compose exec ec pnpm <cmd>` |
| Edit blocked content | `sed -i ...` | `Read` + `Edit` tools |
| Run git mutations | `git commit ...` | HITL executes; agent prepares `git diff` |

## Cross-References

- [Release Self-QA Framework](./release-self-qa-framework.md) — QA process
- ADR-014: [ADLC Subagent Governance](../architecture/adrs/ADR-014-adlc-subagent-governance.md)
