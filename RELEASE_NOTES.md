# Release Notes — Digital-Commerce v1.1.0

**Release date**: 2026-06-04
**Phase**: 1 — Local-first B2B skeleton
**Readiness**: 50 / 100 (was 49 — Technical Architecture test-harness design +1)

---

## Mission

Digital-Commerce is a **quote-assisted B2B marketplace** for ANZ regulated industries (Energy, FSI, Telecom) that replaces 6-week email-PDF procurement cycles with a deterministic Quote → Approval → PO workflow. v1.1.0 is the first run of the **Release Self-QA Framework** — establishing the repeatable test-design and release-acceptance process that every future release will follow.

---

## What v1.1.0 proves

v1.1.0 does not add new product features. It establishes the **quality foundation**: formal test coverage mapping, a 7-phase autonomous QA pipeline, and honest gap acknowledgment. The thesis: a team that tests what it ships — and honestly names what it cannot yet test — earns more enterprise trust than one that inflates coverage claims.

Three research questions govern the framework:
- **RQ1** (this release): Test design — every in-scope flow has a case with persona, tier, and status.
- **RQ2** (next): Automation — `task test:all` runs all tiers idempotently in Docker.
- **RQ3** (future): Autonomous PDCA — enterprise team self-QAs to ≥99.5% with HITL escalation.

---

## Per-persona value

### Buyer-employee (field engineer / ops lead / procurement analyst)

The buyer-employee is the **primary trigger of value** — without them, no quote is created, no approval flows, no PO is generated. v1.1.0 protects their journey by:

- Formally documenting the quote-request flow (TC-E07), spending-limit enforcement (TC-E10, TC-N01), and bulk-cart (TC-E13) as test targets with Given/When/Then criteria.
- Defining TC-N01 (over-limit blocked → approval CTA) and TC-N04 (unauthenticated rejected) as authorization guards — the buyer-employee cannot be bypassed or impersonated.
- All buyer-employee test cases are mapped to the **Control** and **Speed** business-value pillars.

Built today for buyer-employee: quote request (step 1), approval wait (step 2), PO receipt (step 3). Invoice and SOW (steps 4–5) are roadmap.

### Admin / sales-manager (gatekeeper)

The admin is the **compliance anchor** — they produce the audit evidence that APRA CPS 234 §36 requires. v1.1.0 protects their path by:

- Documenting quote-review → negotiate → approve/reject (TC-E08, TC-E11, TC-E12) as test targets.
- TC-N03 (cross-company data denied) confirms the gatekeeper cannot accidentally approve another company's orders — critical for multi-tenant ANZ deployments.
- Both the buyer-employee and admin are named in every test case — the anti-pattern `INVISIBLE_PRIMARY_USER` is structurally prevented.
- Admin-path cases map to **Auditability** and **Compliance** pillars.

### Finance team (evidence consumer, secondary)

Finance does not act in the workflow — they read the output. v1.1.0 ensures:

- TC-E11 and TC-N03 confirm that every approval record carries `approver_id + timestamp + company_id`, queryable for audit. **Auditability pillar**.
- FOCUS 1.2+ 9-key infrastructure tags remain in IaC (validated via `terraform validate`), wiring cost attribution from line 1 for when real AWS spend begins. **Cost attribution pillar**.

---

## Testing posture (RQ1)

| Test tier | Cases designed | Cases passing | Execution status |
|-----------|---------------|---------------|-----------------|
| Tier 1 Static | 3 | 0 | target (execution pending Docker) |
| Tier 2 Integration | 8 (4 unit + 4 neg/authz) | 0 | target (execution pending Docker) |
| Tier 3b E2E | 15 | 4 | 4 passing in live Playwright suite |
| **Total** | **26** | **4 (15%)** | **22 cases designed, not yet executed** |

The 4 passing cases are: TC-E01 (backend health), TC-E02 (admin login), TC-E03 (storefront load), TC-E04 (company create).

No case is claimed "covered" until `task test:<tier>` exits 0 with evidence in `tmp/Digital-Commerce/test-results/`. This is the honest baseline.

---

## Known gaps

- **Integration/E2E execution**: The harness is **built in v1.1.0** (`docker-compose.test.yml` at repo root, tmpfs Postgres project `ec_test`; `apps/backend/jest.config.js`; integration specs; `task test:all`). What remains is the **live green run** (deps install + `task test:all` green twice) — tracked under v1.1.1.
- **Visual verification**: Chrome MCP (storefront :8000) and computer-use MCP (admin terminal, display 2) screenshot gates are defined in the framework but not yet executed — pending container + Playwright MCP provisioning.
- **Invoice/SOW/Implementation**: Steps 4–6 of the canonical workflow are roadmap. Not tested, not claimed.
- **Stripe/PayPal**: Payment provider is mock-only. Real payment flow testing is v0.2+.

---

## Next: v1.1.1 (patch — complete v1.1.0 testing execution)

- **Live RQ2 green**: `task up` (or `docker-compose.test.yml`) → `task test:all` exits 0 **twice** (idempotency proof); aggregated `REPORT.md/.html` PASS.
- **Live RQ3 gate**: `/commerce:release-qa` autonomous PDCA → `rq3-scorecard.json` filled with measured values; release-blocking gate green.
- **Visual verification**: chrome-MCP (:8000) + computer-use (admin, display 2) screenshots captured.
- Resolve the ~25 real static defects triaged in `RQ1-readiness-REPORT.md` (compensate-fn types) — confirmed post `pnpm install`.

## Later: v1.2.0 (features)

- Companies public REST API + admin spending-limit UI (Product Capability 14→16).
- First prospect demo environment packaged (DC-040 enabler).
- GTM readiness target: 55/100.

---

*Canonical workflow: Quote → Approval → PO (built, steps 1–3) → Invoice → SOW → Implementation (roadmap, steps 4–6).*
*Both primary personas (buyer-employee + admin/sales-manager) appear in every section of this document.*
