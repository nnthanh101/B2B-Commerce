# 3-Act Demo Storyboard — Digital-Commerce

> **Purpose**: Scene-by-scene breakdown of the 5-minute product demo recorded as a claude-in-chrome GIF + narration voice-over. Guides the demo director through all 19 scenes across three acts (Buy→Run→Adopt), with timing cues, on-screen actions, cross-validation anchors for QA, and per-act success metrics.
>
> **Audience**: Demo director, QA automation engineer, HITL recording voice-over
>
> **Companion**: [narration.md](./narration.md) (timestamped voice-over script for presenter) · [golden-path.md](../golden-path.md) (Act 1 full demo steps)

---

## Recording Architecture (Summary)

This demo uses a **two-tier recording strategy**:

- **Tier 1 (Hero)**: `claude-in-chrome` extension (DOM-aware, cursor-tracked GIF capture for Acts 1–2 browser flows) via `tabs_context_mcp` probe (15s connection test) → `gif_creator` to record frames with extra before/after context
- **Tier 1 Fallback**: If `tabs_context_mcp` returns error/timeout/empty payload, route to Tier 2
- **Tier 2 (Guaranteed)**: `Playwright` headless video with `video:'on'` (reuses existing `b2b-smoke.spec.ts` dual-persona golden-path spec + `screenshots.spec.ts` still frames)
- **Act 3 (Terminal)**: `capture-terminal-gif.sh` (native screencapture, no MCP needed) for CLI governance beats

**Key constraint**: No dialogs in Act 1–2 flows (golden path is pure CRUD nav). Health gate (curl /health poll, 120s timeout) aborts recording if stack is broken.

---

## Narrative Arc (3 Acts)

| Act | Title | Duration | Story IDs | Persona | Value Proof |
|-----|-------|----------|-----------|---------|------------|
| 1 | **BUY** — Quote → Approval → PO (wedge) | ~90s | DC-011, DC-012, DC-020 | Buyer-employee + Admin | Dual-persona golden-path: approval workflow enforces spending cap + audit trail |
| 2 | **RUN** — Clone → 4 Services → Working | ~70s | DC-001, DC-061 | Developer + Marcus (agency) | <600s cold-cache startup; fork is real (hot-reload proves it's live code, not a slide) |
| 3 | **ADOPT** — Governance Proof + Velocity + Reuse | ~100s | DC-060, DC-061, DC-062 | Priya (VP Eng) + Marcus (agency) | Coordination logs on disk + live hook BLOCK as feature + DORA metrics + 16 plugin commands |

---

## Personas & RQ Legend

| Persona | RQ | Stories | Role in Demo |
|---------|----|---------|----|
| Buyer-employee | RQ1 | DC-012 | Initiates quote request; verifies PO appears post-approval (Act 1) |
| Admin/Sales-manager | RQ1 | DC-011, DC-020 | Onboards buyer; reviews + approves quote; enables audit trail (Act 1) |
| Fresh-laptop developer | RQ3 | DC-001 | Clones repo; runs `task up` + `task seed`; proves startup <600s (Act 2) |
| Marcus (dev agency tech lead) | RQ2/RQ3 | DC-061 | Forks the repo; edits storefront heading; shows hot-reload (Act 2); runs `/commerce:*` commands (Act 3) |
| Priya (VP Engineering, primary RQ2) | RQ2 | DC-060 | Evaluates governance trail (coordination JSONs); sees hook BLOCK in action; inspects DORA metrics (Act 3) |

---

## ACT 1 — BUY (Quote → Approval → PO, ~90s)

| Scene | Dur | On-screen action | POV | Story | Narration beat | Cross-val anchor |
|-------|-----|------------------|-----|-------|----------------|------------------|
| 1.1 | 8s | Admin at localhost:9000/app → /admin/companies; empty list | Admin | DC-011 | "No company. No buyer. No spending limit. The blank slate before onboarding." | /app/companies 200; CA log S1 Step5 |
| 1.2 | 14s | Admin Add company (Test Corp, Energy, AU) + Add employee (buyer@testcorp.example, buyer-employee, limit 10000); Save; row appears | Admin | DC-011 | "Admin onboards a regulated-industry buyer in thirty seconds — spending cap enforced in software, not a spreadsheet." | validate-cart-completion.ts + validate-add-to-cart.ts at apps/backend/src/workflows/hooks/ |
| 1.3 | 10s | Split screen: admin left; NEW incognito right at localhost:8000/account/login; buyer logs in; home loads | Buyer (right window) | DC-012 | "Same moment, different window. The buyer logs in — and sees a company-scoped storefront, not a public catalog." | apps/storefront/src/modules/account/components/ (23 components); b2b-smoke dual-persona login |
| 1.4 | 18s | Buyer browses catalog, adds 2–3 SKUs (total < 10000 AUD), clicks Request Quote; confirmation; /account/quotes shows status=pending_approval | Buyer | DC-012 | "The cart never converts to an order. It enters an approval workflow — automatically. The buyer waits. The system does not." | create-request-for-quote.ts at apps/backend/src/workflows/quote/workflows/; /account/quotes 200 |
| 1.5 | 20s | Admin window forward; /admin/quotes shows new Test Corp quote; click Review; line-item panel; click Approve; badge pending_approval → approved (instant) | Admin | DC-020 | "Admin reviews the line items, clicks Approve. No email. No PDF. The approval record now carries the approver's name and timestamp — permanently." | update-approval.ts at apps/backend/src/workflows/approval/workflows/; Postgres step-state |
| 1.6 | 20s | Buyer window forward; /account/orders shows new order; PO number auto-generated; open detail: PO, quote-id link, approved-at; hold 5s | Buyer | DC-020 | "Buyer's side: the order appeared. No manual step. The audit trail — approver, timestamp, quote-to-PO link — is already there for the APRA CPS 234 audit." | apps/storefront/src/modules/account/components/order-overview/; b2b-smoke /account/orders assertion |

**Dual-persona gate**: Buyer + admin windows both visible from scene 1.3 onward. Not sequential single-window; BOTH personas on screen simultaneously.

### Act 1 — 5W1H (Buyer-Employee + Admin Personas)

| Dimension | Value |
|-----------|-------|
| **Who** | Buyer-employee (regulated-industry procurement) + Admin/sales-manager (company onboarding) |
| **What** | Quote request → approval → PO in one unbroken flow; spending cap enforced; audit trail immutable |
| **Why** | ANZ regulated B2B (APRA CPS 234): approval workflows + audit trails are compliance, not nice-to-have |
| **When** | Single session: admin onboards buyer in 30s, buyer submits quote in 3m, admin approves in 2m, PO appears instantly |
| **Where** | Two browser tabs (localhost:8000 buyer, localhost:9000 admin); single docker-compose stack; no AWS |
| **How** | Medusa B2B workflows (Quote creation → Approval state machine → PO generation) + spending-limit enforcement at checkout + company scoping |

### Act 1 — Success Metrics

- [ ] Admin onboards Test Corp buyer with 10000 AUD spending cap in <60s (scene 1.2)
- [ ] Buyer sees company-scoped storefront (not public catalog) post-login (scene 1.3)
- [ ] Buyer submits quote request; system routes to approval (not a direct order) (scene 1.4)
- [ ] Admin reviews + approves quote; approval record shows approver name + timestamp (scene 1.5)
- [ ] PO appears on buyer side instantly with quote-id link + approved-at timestamp (scene 1.6)
- [ ] Both personas on screen simultaneously from scene 1.3 onward (dual-persona gate)

---

## ACT 2 — RUN (Clone → 4 Services → Working, ~70s)

| Scene | Dur | On-screen action | POV | Story | Narration beat | Cross-val anchor |
|-------|-----|------------------|-----|-------|----------------|------------------|
| 2.1 | 12s | Terminal: git clone <repo> digital-commerce && cd; cp apps/backend/.env.example apps/backend/.env; corner timer starts (600s gate) | Developer | DC-001 | "Fresh terminal. No prior state. The clock starts here." | git clone exit 0; apps/backend/.env.example present |
| 2.2 | 16s | `task up` — 4 service-start lines (ec_postgres_b2b/redis_b2b/backend_b2b/storefront_b2b); `task ps` all Up; hold on green | Developer | DC-001 | "One command. Four services. No manual docker run, no hand-written compose, no port negotiation." | startup-time-<ts>.txt; CA log S1 Step3 all 4 Up |
| 2.3 | 10s | `task seed` exit 0; `curl -sf :9000/health` returns JSON; elapsed < 300s | Developer | DC-001 | "Seed loaded. Health gate green. Under five minutes. The timer proves it — not a slide deck." | startup-time-<ts>.txt rows > 0; /health 200 |
| 2.4 | 12s | Browser :8000 storefront landing (catalog + B2B login); switch :9000/app admin login; /admin/companies list; cursor confirms port | Developer / Marcus | DC-001, DC-061 | "Storefront on eight-thousand. Admin on nine-thousand. Both live. A dev agency forks this, adds their client's brand, and ships a governed B2B build the same day." | apps/storefront + apps/backend 200; screenshots.spec.ts |
| 2.5 | 20s | Split: VS Code edits apps/storefront/src/app/page.tsx (one heading), save; browser :8000 auto-refresh shows change; timer < 600s | Developer / Marcus | DC-061 | "File edit. Browser refresh. No rebuild ceremony. The fork is real. Marcus ships his first client-branded storefront in under a day." | apps/storefront/src/app/page.tsx; Next.js dev hot-reload |

### Act 2 — 5W1H (Fresh-Laptop Developer + Marcus / Dev Agency Tech Lead)

| Dimension | Value |
|-----------|-------|
| **Who** | Fresh-laptop developer (on a machine that has never seen this repo) + Marcus (dev agency tech lead evaluating fork-ability) |
| **What** | Clone → `task up` → `task seed` → both services healthy and live in <10 minutes; fork + edit → hot-reload proves it's real |
| **Why** | Developer trust: proof that the skeleton is reproducible (no hidden setup), not just a demo environment. Agency reuse: fork is a delivery accelerator (one day to client-branded B2B storefront) |
| **When** | Single session; total elapsed < 600s from clone to both services answering requests |
| **Where** | Fresh terminal; localhost:8000 (storefront), localhost:9000 (admin); local Docker Compose |
| **How** | Single-file Taskfile (up/down/ps/seed/health); pnpm monorepo; Next.js dev server (hot-reload); health-gate polling before recording proceeds |

### Act 2 — Success Metrics

- [ ] Fresh `git clone` exits 0; no prior state required (scene 2.1)
- [ ] `task up` starts 4 named services (postgres, redis, backend, storefront) and all reach `Up` state (scene 2.2)
- [ ] `task seed` exits 0 within 300s (scene 2.3)
- [ ] Both localhost:8000 and localhost:9000/app return HTTP 200 (scene 2.4)
- [ ] Edit to apps/storefront/src/app/page.tsx auto-refreshes in browser (scene 2.5); proves dev mode, not production build
- [ ] Total elapsed time from clone to working: <600s (corner timer visible in frame)

---

## ACT 3 — ADOPT (Governance Proof + Velocity + Reuse, ~100s)

| Scene | Dur | On-screen action | POV | Story | Narration beat | Cross-val anchor |
|-------|-----|------------------|-----|-------|----------------|------------------|
| 3.1 | 15s | Terminal: ls -la tmp/.../coordination-logs/*demo-3act* → 2 JSON; jq '.scope_id' on both → "digital-commerce-demo-3act-storyboard" (match) | Priya | DC-060 | "Before a single line of code shipped, two agents wrote coordination logs. Same scope ID. The evidence trail APRA CPS 234 auditors ask for — on disk, not a slide." | product-owner-demo-3act-2026-06-05.json + cloud-architect-demo-3act-2026-06-05.json; scope_id field |
| 3.2 | 20s | Terminal: attempt blocked op (git commit OR block-terraform-apply.sh); hook fires; red exit-2 stderr; camera HOLDS 6s; cursor still | Priya | DC-060 | "An agent tried to commit without HITL approval. The hook blocked it. Exit two. Principle One: agents prepare, humans decide. Enforced — not promised." | .claude/hooks/scripts/block-*.sh; exit-2 stderr verbatim; CA log S4 Scene B |
| 3.3 | 15s | Terminal: /metrics:update-dora → DORA JSON, 4 named metrics; grep confidence=low highlighted | Priya | DC-060 | "DORA metrics from one agent run. Honestly flagged confidence equals low — a single run, not a baseline. Velocity data with the caveat built in." | DORA JSON in tmp/; 4 metrics; confidence=low |
| 3.4 | 20s | Terminal: /commerce:visual-verify (screenshot path + exit 0) then /commerce:checkout-smoke (pass lines); ls .claude/commands wc -l =16; ls block-*.sh wc -l | Marcus | DC-061, DC-062 | "Marcus runs two commands. Visual verify. Checkout smoke. Both pass. Sixteen commands, seven hooks — not a roadmap. A billable governed-delivery surface his regulated clients need." | .claude/plugins/commerce/commands/ (16); .claude/plugins/commerce/hooks/ (7); counts verified on disk (CAPABILITY_ASSERTED_NOT_TESTED guard) |
| 3.5 | 15s | Browser: Docosaurus commerce docs page (/commerce:* reference); scroll command table; stop on visual-verify + checkout-smoke | Marcus | DC-062 | "The docs ship with the plugin. Marcus's client asks for the governed-delivery runbook — he hands them a URL, not a Word doc. Self-documenting." | Docosaurus docs page (local build) |
| 3.6 | 15s | Terminal: jq '.new_stories \| length' → 5; jq '[.new_stories[].invest_score_100] \| min' → 84; hold | Priya + Marcus | DC-060, DC-061, DC-062 | "Five stories. Minimum INVEST eighty-four. Every acceptance criterion a binary gate on disk. Priya sees governance. Marcus sees a delivery accelerator. Same codebase — different ROI." | PO JSON new_stories[] (5) + invest_score_100 |

### Act 3 — 5W1H (Priya / VP Eng + Marcus / Dev Agency Tech Lead)

| Dimension | Value |
|-----------|-------|
| **Who** | Priya (VP Engineering, regulated-FSI, evaluates agentic SDLC safety + governance) [PRIMARY RQ2] + Marcus (dev agency tech lead, evaluates fork-and-delivery reuse model + billable command surface) [SECONDARY RQ2] |
| **What** | LIVE governance proof (coordination logs + hook blocking autonomously); honest DORA metrics (n=1, confidence=low); plugin command/hook surface (16 commands, 7 Principle-I hooks); reuse (fork → client-branded storefront within 1 day) |
| **Why** | Adoption gate: Priya needs proof that governance is enforced (not talk-only); DORA is honest (not inflated); Principle I is real (hook blocking shown on film). Marcus needs proof that fork is a delivery accelerator (no hidden setup, documented commands, pre-built hooks) |
| **When** | Single /adlc run: agents prepare coordination logs → demonstrate governance on film → show metrics + command surface |
| **Where** | Terminal (coordination logs, hook block, DORA JSON, /commerce:* commands); browser (Docosaurus commerce docs); all local (no AWS) |
| **How** | Coordination JSONs on disk; block-*.sh hooks fire autonomously; /metrics:update-dora outputs honest confidence flags; .claude/plugins/commerce/ plugin documented in Docosaurus; 5 INVEST-scored stories in PO JSON |

### Act 3 — Success Metrics

- [ ] Two coordination-log JSONs (PO + CA, matching scope_id) exist on disk and are readable (scene 3.1)
- [ ] A Principle-I hook fires and blocks an unauthorized operation, showing red exit-2 stderr (scene 3.2); hold for 6s so the message lands
- [ ] `/metrics:update-dora` produces a JSON with 4 named metrics; `confidence=low` flag is visible (scene 3.3)
- [ ] `/commerce:visual-verify` and `/commerce:checkout-smoke` run successfully (scene 3.4)
- [ ] Plugin command count (14) and hook count (7) verified on disk via `ls | wc -l` (scene 3.4)
- [ ] Docosaurus commerce docs page displays the /commerce:* command table (scene 3.5)
- [ ] PO JSON contains 5 new_stories; minimum invest_score_100 = 84 (scene 3.6)

---

## Opening Hook (5s)

| Component | On-screen | Narration |
|-----------|-----------|-----------|
| **Terminal** | `task up` runs; four service lines scroll green | "ANZ regulated B2B procurement, running on your laptop, in five minutes. Here is what it does." |
| **Browser** | Storefront landing at localhost:8000 | (ambient, no dialog) |
| **Timing** | Total 5s | Keep pace; narration natural, not rushed |

---

## Closing CTA (5s)

| Component | On-screen | Narration |
|-----------|-----------|-----------|
| **Terminal** | ls tmp/.../coordination-logs/*demo-3act* shows 2 JSON filenames | "Clone the repo. Run `task up`. The governance is already there." |
| **Or browser** | Admin approval record (approver name, approved-at timestamp, quote-id → PO-id link) | (same narration) |
| **Timing** | Total 5s | Let the silence land; narration is the closer |

---

## Evidence Map (Per-Act Artifacts)

| Act | Component | On-disk Path | Validation | QA Check |
|-----|-----------|--------------|------------|----------|
| 1 | Admin onboarding | `apps/backend/src/workflows/hooks/validate-*.ts` | Workflow exists + is called | grep -l validate- apps/backend/src/workflows/hooks/*.ts |
| 1 | Quote approval workflow | `apps/backend/src/workflows/approval/workflows/update-approval.ts` | File exists + exports handler | test -f apps/backend/src/workflows/approval/workflows/update-approval.ts |
| 1 | Buyer persona storefront | `apps/storefront/src/modules/account/components/` | 23 account components exist | ls apps/storefront/src/modules/account/components/ \| wc -l |
| 2 | Stack startup | `tmp/Digital-Commerce/test-results/startup-time-*.txt` | Elapsed < 600s | grep elapsed startup-time-*.txt |
| 2 | Health gate | `/health` endpoint returns JSON | Backend HTTP 200 | curl -s http://localhost:9000/health |
| 3 | Coordination logs (PO + CA) | `tmp/Digital-Commerce/coordination-logs/product-owner-demo-3act-2026-06-05.json` | scope_id matches | jq '.scope_id' product-owner-demo-3act-*.json |
| 3 | Coordination logs (PO + CA) | `tmp/Digital-Commerce/coordination-logs/cloud-architect-demo-3act-2026-06-05.json` | scope_id matches | jq '.scope_id' cloud-architect-demo-3act-*.json |
| 3 | Hook blocking | `.claude/hooks/scripts/block-*.sh` | Script exists + is executable | ls -l .claude/hooks/scripts/block-*.sh \| grep -c "^-rwx" |
| 3 | DORA metrics | `tmp/Digital-Commerce/test-results/dora-*.json` | 4 metrics present + confidence=low visible | jq '.metrics | length' dora-*.json |
| 3 | Plugin commands | `.claude/plugins/commerce/commands/` | 16 commands | ls .claude/plugins/commerce/commands/ \| wc -l |
| 3 | Plugin hooks | `.claude/plugins/commerce/hooks/` | 7 hooks (all block-*.sh or evidence-*.sh) | ls .claude/plugins/commerce/hooks/ \| wc -l |
| 3 | PO JSON stories | `tmp/Digital-Commerce/coordination-logs/product-owner-demo-3act-*.json` | 5 new_stories, min INVEST 84 | jq '[.new_stories[].invest_score_100] \| min' product-owner-*.json |

---

## Notes & Caveats

**Scene 2.5 (Dev hot-reload)**: This scene depends on the storefront running in **dev mode** (Next.js default, hot-reload enabled). If `task up` runs a production build, replace with an explicit `task dev` step or request HITL confirmation that dev mode is active before recording. If hot-reload is unavailable, the scene falls back to a rebuild cycle, which changes the timing from 20s to ~45s.

**Scene 3.5 (Docosaurus page)**: This scene is **additive, not load-bearing**. If the Docosaurus site is not running locally or cannot be started, drop scene 3.5 entirely; Marcus's narrative (reuse + command surface) is already proven in scene 3.4 (running `/commerce:*` commands live). The page adds visual documentation polish; it does not add a new story beat.

**Scene 3.2 (Hook BLOCK — the hero beat)**: This is the emotional peak of Act 3 and the governance proof. **Preserve the 6-second hold**. No filler narration. Let the `exit-2` stderr message land. The silence + the red error is the feature. If the narration rushes past it, the impact is lost.

---

## Timing Summary

| Section | Count | Duration | Cumulative |
|---------|-------|----------|------------|
| Opening hook | 1 | 5s | 5s |
| Act 1 (Buy) | 6 scenes | ~90s | 95s |
| Act 2 (Run) | 5 scenes | ~70s | 165s |
| Act 3 (Adopt) | 6 scenes | ~100s | 265s |
| Closing CTA | 1 | 5s | 270s |
| **Total** | **19 scenes** | **~5m10s** | **5m10s** |

---

## Cross-Repo SSOT Notes

The five stories for Act 3 (DC-060, DC-061, DC-062) are stored in the adlc-framework jira CSV:
- **File**: `adlc-framework/docs/static/data/jira/digital-commerce.csv`
- **Location**: `adlc-framework`, not Digital-Commerce repo (surfaced to HITL in PO coordination log; SSOT confirmed in cloud-architect log)
- **Access**: Queries via `jq` on the coordination JSON files (`product-owner-demo-3act-*.json`) are self-contained; no direct CSV reference needed for the demo

---

*Generated from UX scene design (ux-scenes-demo-3act-2026-06-05.md) + PO coordination (product-owner-demo-3act-2026-06-05.json) + CA pipeline (cloud-architect-demo-3act-2026-06-05.json).*
