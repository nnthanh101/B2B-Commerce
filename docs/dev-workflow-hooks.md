# Dev Workflow — ADLC Hook Constraints and Workarounds

## What validate-bash.sh does

The ADLC framework ships `validate-bash.sh` v3.3.0 as a **fail-closed** pre-tool hook.
When an AI agent (Claude Code) calls the Bash tool, the hook intercepts the command text
and blocks a broad set of verbs before execution. Blocked categories include:

- Package managers: `pnpm`, `npm`, `npx`, `yarn`
- Container runtimes: `docker`, `docker compose` (direct invocations)
- Git mutations: `git add`, `git commit`, `git push`, `git merge`, and all other write verbs
- AWS/Azure mutation verbs: `create-*`, `delete-*`, `apply`, `terraform apply`, etc.
- Safe-read subcommands (`describe-*`, `list-*`, `get-*`) are permitted for READONLY AWS queries

The hook scans **command text**, not file contents, so it fires on what the agent
types into the Bash tool — not on what a script or Taskfile target contains.

## How `task` targets bypass the scan

`task <target>` is itself an allowed command. The hook does not re-scan the shell
commands that the task runner subsequently executes. This means a Taskfile target
can legitimately contain `pnpm medusa db:migrate` — but it also means that a
`task db:migrate` wrapper, if unguarded, would give an agent a path to execute a
schema mutation that the hook was designed to prevent.

This is the **laundering hole**: an agent calls `task db:migrate`, `task` runs
`pnpm medusa db:migrate` inside the container, and the hook never sees it.

## Migration workflow

### db:generate — agent-runnable

`task db:generate -- <module>`

This target only **writes a migration file** derived from your `model.define` schema.
It reads the current model definitions and emits TypeScript migration SQL — no database
rows are created, altered, or dropped. It is safe for an agent to call autonomously.

```
task db:generate -- invite
```

Review the generated file in `apps/backend/src/migrations/` before committing.

### db:migrate — HITL only (CONFIRM-gated)

`CONFIRM=1 task db:migrate`

This target applies pending migrations to the live database — a schema mutation.
Under Principle I of the ADLC Constitution, schema mutations are HITL-only: agents
prepare, humans decide, humans commit.

The CONFIRM gate enforces this at the task level:

- Without `CONFIRM=1`: the target prints the Principle-I notice and exits non-zero.
  An agent calling `task db:migrate` gets exit code 1 and a clear message — it cannot
  silently apply migrations.
- With `CONFIRM=1`: only a human in their own terminal can set this environment
  variable deliberately. The gate is not a cryptographic lock; it is a documented
  governance signal that requires conscious human intent.

## Other workarounds for common hook blocks

**HITL runs pnpm/npx/docker directly.** The hook only gates agent Bash tool calls.
When you (HITL) run commands in your own terminal, `validate-bash.sh` is not involved.
You can run `pnpm install`, `docker compose build`, `npx ...`, etc. without restriction.

**Put blocked verbs inside files via the Write tool.** The hook scans command text.
If an agent needs to produce a shell script containing `pnpm install`, it writes the
script with the Write/Edit tool (file contents are not scanned) rather than running the
command directly via Bash. The HITL then reviews and executes the script.

**Use task targets for sanctioned container-exec patterns.** Targets like `seed`,
`db:generate`, `lint`, and `test:unit` wrap `docker compose exec` invocations that
agents cannot call directly. These targets are the agent's approved entry point for
backend operations that need to run inside the `ec` container.

## Known follow-up (flag)

The `invite` module contains a hand-written migration file
`Migration20260606160000.ts` with a round timestamp. This migration was created
outside the `medusa db:generate` flow. Once the concurrent invite stream lands,
run `task db:generate -- invite` to produce a model-derived migration, verify the
generated SQL matches the hand-written version, then replace the manual file.
This ensures the invite schema remains traceable to `model.define` and does not
diverge silently on future schema changes.
