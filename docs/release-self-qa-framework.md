# Release Self-QA Framework (RSF) — Standard Operating Procedure

> **Version**: 1.1.0 — first run: Digital-Commerce v1.1.0; next release: v1.1.1 (live test execution)
> **Owner**: HITL (T-Shape manager) + enterprise-team AI agents (ADLC v1.2.0)
> **Authority**: `tmp/Digital-Commerce/coordination-logs/product-owner-2026-06-04-v110-rsf.json` + `cloud-architect-2026-06-04-v110-rsf.json` (PO 96% / CA 96% — ≥95% gate met)
> **Invocation**: `/commerce:release-qa` or `task test:all`
> **Canonical SSOT**: `.claude/plugins/commerce/knowledge/plan/Digital-Commerce-Release-Self-QA-Framework-v1.x.md`

---

## Purpose

The RSF is the **repeatable, enterprise-team self-test / self-QA pipeline** executed for every Digital-Commerce release. It replaces ad-hoc manual testing with a 7-phase structured process that emits:
- Persona + business-value **changelog** (for stakeholders)
- **Technical excellence** artifacts (automation + autonomous testing + visual verification)
- **Enterprise quality gates** with HITL escalation when ≥99.5% is not reached autonomously

For INVEST story definitions, component justification, and architecture decisions, see the canonical plan (links below). This SOP focuses on **how to run each phase** — the operator view.

---

## Quick-reference links to canonical plan

| Topic | Plan section |
|-------|-------------|
| INVEST user stories (US-RSF-01..09) with full 5W1H | Knowledge-plan §5 |
| Component justification summary | Knowledge-plan §6 |
| Complete component-effectiveness table (by TYPE) | Knowledge-plan §16 |
| RQ2 vs RQ3 scorecard dimensions | Knowledge-plan §7 |
| Files to create / modify | Knowledge-plan §8 |
| Taskfile contract | Knowledge-plan §9 |
| Enterprise quality gates | Knowledge-plan §10 |
| Definition of Done | Knowledge-plan §11 |
| Model × Performance policy | Knowledge-plan §14 |
| Lessons learned | Knowledge-plan §15 |

---

## Enterprise quality gates (BLOCKING)

Before any release proceeds, all four gates must be satisfied:

| Gate | Threshold | Evidence path |
|------|-----------|---------------|
| PDCA autonomous score | ≥99.5% (`validation_score`) | `tmp/Digital-Commerce/pdca-cycles/cycle-N-*.json` |
| Agent agreement (PO + CA + QA) | ≥95% | P0 and P6 coordination logs |
| MCP-vs-native accuracy | ≥99.5% | `cross-validation-docs` output |
| RQ3 autonomous gate | PASS | `tmp/Digital-Commerce/test-results/rq3-scorecard.json` |

If any gate fails after 3 PDCA cycles: **HITL escalation** (release blocked; HITL reviews evidence and decides).

---

## 7-Phase operator runbook

### P0 — Discover & Align (RQ1 framing + changelog skeleton)

**Model**: Opus | **Agents**: `product-owner` + `cloud-architect`

**Operator action:**
```bash
task adlc SCOPE=digital-commerce-release-vX.Y.Z
```

**What to verify at exit:**
- INVEST stories (≥4/6 each) in `tmp/Digital-Commerce/coordination-logs/`
- Persona changelog skeleton drafted (buyer-employee + admin/sales-manager both named)
- PO+CA agreement ≥95% recorded in coordination logs

**Exit gate**: Coordination logs present + ≥95% PO/CA agreement.

> INVEST story definitions: canonical plan §5.

---

### P1 — Test Design (RQ1)

**Model**: Sonnet (Opus review) | **Agent**: `qa-engineer`

**Operator action:**
```bash
task adlc:plan SCOPE=test-design
```

**What to verify at exit:**
- `tests/TEST-CASES.md` updated: Persona column added, every in-scope flow has a case
- Gap cases mapped to `target: Tier 2 integration` or `target: Tier 3 e2e`
- Negative/authorization section: ≥4 cases (over-limit, approval-required, cross-company, unauthenticated)
- `failure-routing-5w1h` table for any deferral

**Exit gate**: DC-### × persona × tier matrix complete; no uncategorized gap rows.

---

### P2 — Automation Harness (RQ2)

**Model**: Haiku (exec) + Sonnet (wiring) | **Agents**: `qa-automation-engineer` + `commerce-engineer`

**Test stack — standalone (NOT a dev-compose override):**
```bash
# docker-compose.test.yml is at repo ROOT (provisioned v1.1.0)
docker compose -f docker-compose.test.yml -p ec_test up -d
```

**Taskfile contract (container-first; no host pnpm/jest):**
```
test:static       → exec ec pnpm turbo lint (+tsc --noEmit)
test:db:up        → compose -f docker-compose.test.yml -p ec_test up -d + migrate + seed
test:integration  → exec ec pnpm --filter backend jest --selectProjects integration
test:e2e          → docker run playwright npx playwright test tests/e2e/
test:visual       → chrome-MCP (:8000) + computer-use MCP (admin, display 2) → screenshots
test:report       → docker run node aggregate-report.mjs → REPORT.md/.html
test:all          → deps:[static, db:up, integration, e2e, visual] → report → db:down
```

**What to verify at exit:**
- `task test:all` exits 0 **twice** (two timestamped logs — idempotency gate)
- 3 risk surfaces exercised; ≥4 negative/authz pass

**Exit gate**: `task test:all` green twice; idempotency confirmed.

> Full Taskfile spec and risk surface list: canonical plan §8–§9.

---

### P3 — Visual Verification

**Model**: Sonnet orchestrate | **MCPs**: `claude-in-chrome` + `computer-use`

**Operator action:**
```bash
task test:visual
```

**What to verify at exit:**
- `tmp/Digital-Commerce/test-results/screenshots/` contains PNGs for **both** surfaces:
  - Storefront journey at `:8000` (buyer-employee persona)
  - Admin + terminal on display 2 (admin/sales-manager persona)

**Exit gate**: PNG screenshots present for BOTH storefront (:8000) and admin/terminal (display 2).

> Anti-INVISIBLE_PRIMARY_USER: both personas must appear in screenshots.

---

### P4 — Autonomous Testing (RQ3)

**Model**: Haiku (loop) + Sonnet (score) | **Agents**: `qa-automation-engineer` + `qa-engineer`

**Operator action:**
```bash
/commerce:release-qa   # drives the PDCA loop
# or monitor via:
task test:all          # single-pass; loop is managed by release-qa command
```

**What to verify at exit:**
- `tmp/Digital-Commerce/pdca-cycles/cycle-N-YYYY-MM-DD.json` for each cycle
- `tmp/Digital-Commerce/test-results/rq3-scorecard.json` present
- `validation_score ≥ 0.995`; release-blocking gate PASS
- No-progress stop rule: 2 consecutive cycles <0.5% improvement → HITL escalated
- 3× repeatability: stddev of pass rates <2%

**Exit gate**: `rq3-scorecard.json` present; `validation_score ≥ 0.995`.

---

### P5 — Plugin Upgrade + Release Artifacts

**Model**: Sonnet | **Agents**: `commerce-engineer` + `technical-writer`

**What to verify at exit:**
- Plugin bumped: `0.3.0 → 0.4.0` (+1 skill `b2b-test-strategy`, +1 cmd `/commerce:release-qa`, +Playwright MCP)
- `CHANGELOG.md` + `RELEASE_NOTES.md` authored (persona + technical sections)
- `docs/readiness-scorecard.md` re-scored (honest delta; cite harness)
- This runbook (`docs/release-self-qa-framework.md`) present and accurate

**No changelog entry may claim un-built steps.** Honest built/roadmap split required.

**Exit gate**: All 5 release documents present; plugin version bump committed by HITL (not agent).

---

### P6 — Release Gate + Retro

**Model**: Opus | **Agents**: `qa-engineer` + `product-owner` + `cloud-architect`

**Operator action:**
```bash
/ceremony:retro
```

**What to verify at exit:**
- Re-score: PO + CA + QA-engineer score **sequentially** (not parallel — prevents race conditions)
- Agreement ≥95% across all 3 agents
- `failure-routing-5w1h` sweep: every non-PASS item classified
- Retro evidence in `framework/retrospectives/`
- Principle I completion report: HITL reviews `git diff --stat` and commits

**Exit gate**: ≥99.5% PDCA + ≥95% agreement + 5W1H matrix + retro evidence + Principle I completion report.

---

## MCP cross-validation (≥99.5% accuracy gate)

The `cross-validation-docs` skill validates MCP tool outputs vs native SDK/CLI:
- `claude-in-chrome` MCP output vs native Playwright assertion
- `context7` MCP documentation vs official Medusa docs
- `playwright-mcp` assertion vs `task test:e2e` output

Any discrepancy >0.5% = gate FAIL → HITL escalation.

---

## HITL escalation protocol (Principle I)

Agents prepare. Humans decide. Humans commit.

When any gate fails after 3 PDCA cycles:

```
Work complete (with exceptions). Ready for HITL review.
Evidence: tmp/Digital-Commerce/pdca-cycles/cycle-3-YYYY-MM-DD.json
Failure: [gate name] = [actual score] (threshold: [threshold])
Next action: HITL reviews evidence path above and decides release / rollback.
  git diff --stat   [to review changes]
  git add -A && git commit -m "release: vX.Y.Z" && git push   [HITL executes if approved]
Decision is yours.
```

No agent runs `git commit` or `git push`. No exceptions.

---

## Invocation (one command per release)

```bash
# Full pipeline (P0–P6):
task test:all

# Or via plugin command:
/commerce:release-qa

# Individual phases:
task test:static          # P2 Tier 1
task test:integration     # P2 Tier 2
task test:e2e             # P2 Tier 3b
task test:visual          # P3 visual verification
task test:report          # Aggregate REPORT.md/.html
```

---

## Evidence inventory

| Artifact | Path |
|----------|------|
| PDCA cycle scores | `tmp/Digital-Commerce/pdca-cycles/cycle-N-YYYY-MM-DD.json` |
| RQ3 scorecard | `tmp/Digital-Commerce/test-results/rq3-scorecard.json` |
| Visual screenshots | `tmp/Digital-Commerce/test-results/screenshots/` |
| Aggregate test report | `tmp/Digital-Commerce/test-results/REPORT.{md,html}` |
| Integration test log | `tmp/Digital-Commerce/test-results/integration-results.log` |
| E2E HTML report | `tmp/Digital-Commerce/test-results/playwright-report/` |
| Coordination logs | `tmp/Digital-Commerce/coordination-logs/` |

---

## Risk surfaces (integration + E2E test priority)

These three files carry the highest defect severity — test them first:

1. `apps/backend/src/workflows/hooks/validate-cart-completion.ts` — spending-limit enforcement (TC-N01, TC-N02)
2. `apps/backend/src/workflows/quote/steps/validate-quote-acceptance.ts` — quote state transitions (TC-E07–TC-E09)
3. `apps/backend/src/workflows/approval/steps/` — approval gate blocking (TC-E10–TC-E12)

These are validated by integration + E2E tiers, not unit tests. Unit mocks of these paths produce `TESTING_THEATER`.

---

*This SOP versions with the plugin. Re-run it unchanged next release — update only the evidence paths and version numbers. For INVEST stories, component justification, and architecture decisions, see the canonical plan: `.claude/plugins/commerce/knowledge/plan/Digital-Commerce-Release-Self-QA-Framework-v1.x.md`.*
