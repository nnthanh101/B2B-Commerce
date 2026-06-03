# LEAN · 5S · 3定 — Repository Operating Standard

**Scope:** every file and every line in `Digital-Commerce`.
**Owner:** Principal Cloud/DevSecOps Architecture · **Adopted:** 2026-06-03 · **Enforced by:** CI (`.github/workflows/ci.yml`) + local hooks.

---

## 0. How "every file / every line" is actually enforced

A principal-engineer reading of _"apply LEAN/5S/3T to every file and line"_ is **not** "hand-edit 622 vendored Medusa files." Mass-rewriting upstream code is itself the largest waste (_muda_): it forks us from upstream, destroys traceability, and creates permanent merge cost. Instead the standard reaches every file through **three mechanisms**, with one rule about vendored code:

| Mechanism            | Reaches                        | How                                                     |
| -------------------- | ------------------------------ | ------------------------------------------------------- |
| **`.editorconfig`**  | every file, every editor       | charset, LF, final newline, indent, trailing-whitespace |
| **`.gitattributes`** | every text file                | normalize to LF; label binaries / generated / vendored  |
| **CI gates**         | every changed file on every PR | lint, format, markdownlint, build, terraform fmt        |

> **Vendored rule (LEAN):** `apps/**` (the Medusa B2B Starter) is _governed but not churned_. We hold it to whitespace/EOL standards and lint, but we do **not** wholesale-reformat it. New code we author conforms fully. This keeps us mergeable with upstream while still standardized.

---

## 1. LEAN — eliminate the 8 wastes (in a codebase)

| Waste (TIMWOODS)    | In code / docs                               | Our control                              |
| ------------------- | -------------------------------------------- | ---------------------------------------- |
| **Transport**       | files scattered across the tree              | 定位 Fixed Location (§3)                 |
| **Inventory**       | dead code, stale branches, unmerged WIP      | Sort (§2); deleted the 2022 line         |
| **Motion**          | hunting for where things live                | one canonical layout, `README` index     |
| **Waiting**         | slow/flaky CI, manual approvals              | lean CI jobs, OIDC, autoscaling          |
| **Over-processing** | gold-plating, premature EKS/Kafka/OpenSearch | explicit MVP non-goals (blueprint §4)    |
| **Over-production** | duplicate configs, copy-paste                | 定量 Fixed Quantity (§3); shared modules |
| **Defects**         | lint/type errors, broken links, trailing ws  | Shine (§2) + CI                          |
| **Skills**          | undocumented tribal knowledge                | docs-as-code, ADRs, runbooks             |

---

## 2. 5S — Sort · Set in order · Shine · Standardize · Sustain

| S                | Japanese      | Rule for this repo                                                                                     | Enforced by                                         |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **Sort**         | 整理 Seiri    | Only what's needed is tracked. No dead code, no stale deliverables, no committed secrets/build output. | `.gitignore`, PR review, `git rm` of waste          |
| **Set in order** | 整頓 Seiton   | A fixed, predictable place for every artifact type.                                                    | 定位 layout (§3), CODEOWNERS                        |
| **Shine**        | 清掃 Seiso    | Code is clean on every commit: formatted, linted, no trailing-ws defects, no broken links, LF endings. | `.editorconfig`, Prettier, ESLint, markdownlint, CI |
| **Standardize**  | 清潔 Seiketsu | One documented convention per concern (naming, commits, versions, formatting).                         | this file, `CONTRIBUTING.md`, Conventional Commits  |
| **Sustain**      | 躾 Shitsuke   | Standards are automated, not aspirational — they run on every PR.                                      | CI, branch protection, PR template, hooks           |

---

## 3. 3定 (San-Tei) — the Three Fixes

The visual-management complement to 5S. _(The governance reading — Traceability, Transparency, Trust — is in §4 and is satisfied by the same controls.)_

### 定位 — Fixed **Location** (a place for everything)

```text
Digital-Commerce/
├── apps/         # runtime ONLY (Medusa backend + Next.js storefront) — vendored, governed
├── infra/        # IaC ONLY (Terraform) — Phase 2+
├── packages/     # shared internal libraries — when extracted
├── docs/         # knowledge ONLY (blueprint, ASSESSMENT, ADRs, this standard, runbooks)
├── .github/      # automation ONLY (CI, CODEOWNERS, templates)
└── <root>        # project meta ONLY (README, CHANGELOG, features, TODO, LICENSE, NOTICE, dotfiles)
```

Rule: no source at root, no docs inside `apps/`, no IaC outside `infra/`.

### 定品 — Fixed **Identity** (everything labelled for what it is)

- Files named for their role; directories single-purpose.
- `.gitattributes` labels **binary / generated / vendored** so diffs and language stats are honest.
- `CODEOWNERS` labels who owns each path.
- Conventional Commits label every change `type(scope):`.

### 定量 — Fixed **Quantity** (one source of truth, controlled amounts)

- **Pinned versions:** pnpm `9.15.0`, Node `≥20`, Medusa `2.15.5`, Next `15.5.18`. Lockfile committed.
- One config per concern; no duplicate sources of truth.
- License + attribution centralized in `LICENSE` + `NOTICE` + `docs/third-party/`.

---

## 4. 3T governance overlay — Traceability · Transparency · Trust

| T                | Meaning                                 | Mechanism in this repo                                                                        |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Traceability** | every change is attributable & linkable | Conventional Commits, `CODEOWNERS`, ADRs, ADLC evidence schema (blueprint §6)                 |
| **Transparency** | state is visible to all stakeholders    | docs-as-code, `CHANGELOG`, `ASSESSMENT`, FinOps FOCUS cost views, myApplications              |
| **Trust**        | changes are safe by construction        | CI gates, dependency/IaC/secret scanning, `SECURITY.md`, branch protection, HITL on AI writes |

---

## 5. Per-file-type standard

| Type                   | Indent | Format / lint                               | Notes                          |
| ---------------------- | ------ | ------------------------------------------- | ------------------------------ |
| TS / TSX (`apps/**`)   | 2 sp   | app's own ESLint/Prettier                   | governed, not bulk-reformatted |
| JSON / YAML (ours)     | 2 sp   | Prettier                                    | CI `--check`                   |
| Markdown               | 2 sp   | Prettier (format) + markdownlint (semantic) | 2-space hard breaks preserved  |
| Terraform (`infra/**`) | 4 sp   | `terraform fmt`                             | CI when `infra/` exists        |
| Python (utilities)     | 4 sp   | (ruff/black when added)                     | —                              |
| Shell                  | 2 sp   | `shfmt`/shellcheck (when added)             | —                              |
| Images                 | —      | —                                           | `binary` in `.gitattributes`   |

---

## 6. Sustain — enforcement matrix (rule → tool → gate)

| Rule                                | Tool                               | Where it runs                   |
| ----------------------------------- | ---------------------------------- | ------------------------------- |
| LF + final newline + no trailing ws | `.editorconfig` / `.gitattributes` | editor + git                    |
| Code style                          | ESLint (`pnpm lint`)               | CI `quality`                    |
| Format (json/yaml/our code)         | Prettier (`--check`)               | CI `quality`                    |
| Markdown format + hygiene           | Prettier + markdownlint-cli2       | CI `quality`                    |
| App builds                          | `pnpm build`                       | CI `build`                      |
| IaC format                          | `terraform fmt -check`             | CI `iac` (when `infra/` exists) |
| Ownership review                    | `CODEOWNERS`                       | branch protection               |
| Conventional history                | Conventional Commits               | review (commitlint TODO)        |
| No secrets / vulns                  | dependency + secret scan           | CI (TODO — see `TODO.md` §4)    |
| Required FinOps tags                | tag policy on `terraform plan`     | CI (TODO — Phase 2)             |

---

## 7. Audit baseline — 2026-06-03

State at adoption (post foundation-reset commit `521cdb3`):

| Check                                                                | Result                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Empty directories                                                    | **0** ✅                                                   |
| Cruft (`.DS_Store`, `*.log`, `*.bak`, `~`) tracked                   | **0** ✅                                                   |
| Committed secrets (`.env`, `*.pem`, keys)                            | **0** ✅ (only `.env.template`)                            |
| CRLF line endings in tracked text                                    | **0** ✅ (all LF)                                          |
| Trailing-whitespace defects in authored docs                         | **0** ✅                                                   |
| `.gitignore` coverage (node_modules, .env\*, dist, .next, .DS_Store) | complete ✅                                                |
| Tracked inventory                                                    | 319 tsx · 251 ts · 14 md · 12 json (Medusa app + our docs) |
| Sustain guardrails present before this pass                          | **none** ❌ → **installed** ✅                             |

Minor, accepted-as-is (no churn): `apps/storefront/LICENSE` (upstream MIT retained inside the vendored app — covered by `NOTICE`); `docs/b2b-blueprint.md` uses valid 2-space hard breaks (permitted by MD009).

---

## 8. Compliance checklist (per change)

- [ ] In its **fixed location** (§3); nothing misplaced.
- [ ] **Sort** — no dead code/files; no secrets; no build output.
- [ ] **Shine** — `pnpm lint`, Prettier, markdownlint pass; LF; no trailing-ws defect.
- [ ] **Standardize** — Conventional Commit; pinned versions respected.
- [ ] **Sustain** — CI green; tests updated where behavior changed.
- [ ] **3T** — linked story/ADR (traceable); docs updated (transparent); scans/HITL pass (trust).

## 9. Run the checks locally

```bash
pnpm lint
pnpm dlx prettier@3 --check .
pnpm dlx markdownlint-cli2 "**/*.md" "!apps/**"
pnpm test
```
