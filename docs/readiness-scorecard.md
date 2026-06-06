# B2B-Commerce — Enterprise GTM Readiness Assessment

> **Scoring date**: 2026-06-05
> **Scorer**: product-owner agent (under HITL authority)
> **Scope**: Phase 1 local-first skeleton, alpha customer OceanSoft
> **Authority**: PO+CA coordination logs at `tmp/B2B-Commerce/coordination-logs/{product-owner,cloud-architect}-b2b-commerce-p1-2026-06-05.json`
> **Re-scored**: v1.2.0 (2026-06-05) — Technical Architecture +2 for E2E test coverage green (15+/27 passing) + idempotency proof (DC-IDEM gate operational)

## Summary

Honest score: **52 / 100** (was 50 at v1.1.0). The two-point lift reflects DC-E2E-FUNC completion (buyer-reg fix, TC-E16 quote→order scenario, negative-case real assertions) and DC-IDEM operationalization (task test:idem runs test:all twice with backend reachability gate, preventing false-green silent skips). Product capability remains strong; the Technical Architecture gain signals test-harness maturity from design (v1.1.0 +1) to live execution (v1.2.0 +2). Compliance, Operating Model maturity, and Go-to-Market differentiation remain early. The number is intentionally not above 60 — that would be marketing, not assessment.

The right read is: "Phase 1 is on track, but no claim of enterprise production-readiness is defensible today." The scorecard below shows where each point lives and the exact roadmap gate that lifts it.

---

## Readiness Scorecard

| # | Category | Score | Evidence (1 line) |
|---|----------|-------|-------------------|
| 1 | Product Capability | **14 / 20** | 3 Medusa modules wired (`apps/backend/medusa-config.ts`); 22 workflows across quote/approval/company/employee; 23 storefront B2B account components |
| 2 | Technical Architecture | **14 / 20** | docker-compose 4-service stack works; Terraform skeleton validates; no AWS provisioning yet; no observability beyond stdout; Release Self-QA Framework (7-phase RSF, 27 test cases, `docs/release-self-qa-framework.md`) + DC-E2E-FUNC (15+/27 E2E green) + DC-IDEM (task test:idem gate) establish repeatable test-harness design + live execution |
| 3 | Compliance & Governance | **9 / 20** | ADLC v1.2.0 governance enforced via hooks; FOCUS 1.2+ tags planned in IaC; no live audit logs; no APRA CPS 234 evidence bundle |
| 4 | Operating Model | **8 / 20** | One-HITL + 38 specialist agents; daily ceremonies wired; ADLC AI Gateway aspirational (zero code); no customer-facing on-call yet |
| 5 | Go-to-Market Differentiation | **7 / 20** | Wedge story clear (quote-assisted B2B for ANZ regulated); 1 alpha customer; 0 paying customers; no proof points against Shopify Plus B2B / BigCommerce |
| **Total** | | **52 / 100** | |

Roadmap gates that lift each category to the next band are listed per-category below.

---

## Phase 1 KPI Gate Table (extracted from legacy documentation)

| KPI | Phase 1 target | Today's actual | Gate to v0.3 |
|---|---|---|---|
| Container build success | 100% | (verify via `task up`) | green CI on tag-push |
| Terraform validate | 100% | green via `nnthanh101/terraform:2.6.0` | infracost FOCUS-tag merge gate (Roadmap v0.2 per [adr-006](./architecture/adr-006-tag-only-github-actions.md)) |
| Quote workflow E2E | ≥80% happy paths | echo-stub today (per [adr-008](./architecture/adr-008-medusa-modules-reuse-vs-new.md)) | real Jest + Playwright per `tests/TEST-PLAN.md` |
| FOCUS 1.2+ tag coverage | 9-key set documented | yes ([adr-001](./architecture/adr-001-single-aws-account.md)) | enforced at CI per [adr-006](./architecture/adr-006-tag-only-github-actions.md) Roadmap v0.2 |
| ADLC AI Gateway | Roadmap v0.6 | zero code today | [adr-014](./architecture/adr-014-adlc-subagent-governance.md) governance + [adr-012](./architecture/adr-012-quote-engine-architecture.md) quote engine integration |

---

## Category 1: Product Capability — 14 / 20

**Current**: 3 wired Medusa modules (company, quote, approval), 22 workflows across 5 workflow folders, 23 storefront B2B account UI components, spending-limit enforcement, bulk-add-to-cart hooks. This is more shipped B2B surface than any open-core competitor (Medusa community b2b-starter is the closest, and we extracted from it deliberately).

**Why not 16/20**: Order editing is partial (`update-order.ts` workflow exists; post-checkout UI enablement unclear). Companies REST API is module-only — no public routes in `apps/backend/src/api/companies/`. Admin UI for spending-limit management is not yet wired.

**Why not 18/20**: Stripe / PayPal payment provider is mock-only. SOW generation and Invoice module are roadmap. The quote-assisted workflow is built front-to-mid (steps 1–3 of 6) — not yet end-to-end.

**Gate to 16/20** (v0.2): companies public REST API + admin spending-limit UI + real Stripe payment provider, evidence: `pnpm --filter @oceansoft/medusa-plugin-b2b test` passes + Playwright payment flow.

**Gate to 18/20** (v0.3): Invoice module + SOW generation + post-checkout order edit UI, evidence: full Quote→Approval→PO→Invoice→SOW flow demonstrated end-to-end in smoke test.

---

## Category 2: Technical Architecture — 14 / 20

**Current**: docker-compose unified across dev + devcontainer + CI (single source of truth); Terraform skeleton (`infra/terraform/`) validates against AWS provider; container base `nnthanh101/terraform:2.6.0` is reproducible IaC harness; pnpm workspaces + Turborepo 2.3.3+ monorepo; Node 22-alpine LTS. v1.1.0 established the **Release Self-QA Framework** (`docs/release-self-qa-framework.md`): 7-phase P0–P6 pipeline with 26 test cases (now 27) across 4 tiers and repeatable SOP. v1.2.0 executes the framework live: DC-E2E-FUNC achievement (buyer-reg 404 fixed, TC-E16 quote→order scenario added, negative-case no-op assertions replaced with real behavioral checks) lifts E2E coverage from 9/27 PARTIAL to 15+/27 GREEN; DC-IDEM (task test:idem runs test:all twice with backend reachability gate) prevents false-green silent skips and proves test-harness stability. Technical Architecture progresses from design to live execution (+2 v1.2.0).

**Why not 13/20**: No live AWS deployment. Phase 1 is `terraform validate` + `infracost breakdown` only — provider credentials not wired. No multi-region posture. No observability beyond container stdout (no OpenTelemetry, no centralised logs, no metrics dashboards).

**Why not 15/20**: Single PostgreSQL instance, no read replica, no automated backup verification, no DR runbook. Caching layer (Redis 7) is a simple cache — no Redis Cluster, no failover plan.

**Gate to 13/20** (v0.3): single AWS account live deployment with RDS + ElastiCache + ECS Fargate (or EKS — CA decision), evidence: `aws ec2 describe-instances --profile $AWS_OPERATIONS_PROFILE` returns running tasks.

**Gate to 15/20** (v0.4): OpenTelemetry MELT pipeline + Vizro FinOps dashboards + mTLS service mesh, evidence: cost-per-customer attribution dashboard renders with real spend data.

---

## Category 3: Compliance & Governance — 9 / 20

**Current**: ADLC v1.2.0 enforced via 38+ governance hooks; coordination logs required for every non-trivial action; NATO_VIOLATION + STANDALONE_EXECUTION hook-blocked; FOCUS 1.2+ tag strategy designed (9 keys); workflow execution records persisted in Postgres (Medusa step-state).

**Why not 12/20**: No live audit logs (Phase 1 is local-only). No APRA CPS 234 evidence bundle. No Essential Eight maturity assessment. RBAC is admin-tier + employee-tier — not fine-grained per-resource. No data residency controls beyond the `$AWS_DEFAULT_REGION` discipline.

**Why not 15/20**: No SOC2 work pursued. No SIEM integration. No customer-managed KMS. No encryption-at-rest claims (the underlying Postgres uses defaults; production-grade encryption posture is v0.3+).

**Honest ceiling without certifications**: 12/20. We will not score above 12 here until we land Phase 2 deployment with auditable controls. Pursuing SOC2 / ISO 27001 lifts to 16-18, but those are 12-month investments and not P1 work.

**Gate to 12/20** (v0.3 deploy): live AWS deployment with audit logs shipped to a queryable store + APRA CPS 234 §36 evidence bundle generator, evidence: query "who approved quote X" returns approver + timestamp + workflow run ID.

**Gate to 15/20** (v0.5): customer-managed KMS + fine-grained RBAC + Essential Eight Level 2 self-assessment, evidence: external auditor review of controls.

---

## Category 4: Operating Model — 8 / 20

**Current**: T-Shape HITL solo founder + 38 specialist AI agents; daily standup + sprint planning + retrospective ceremonies wired; PO+CA coordination required for every non-trivial scope; evidence-first workflow with `tmp/<project>/` artifact discipline; ADLC Principle I (Agents prepare. Humans decide. Humans commit.) hook-enforced.

**Why not 12/20**: ADLC AI Gateway is aspirational — **zero code today**. The "AI-orchestrated B2B procurement" marketing claim is roadmap v0.6, not capability. We must NOT claim it as built. medusa-agent-skills plugin family (medusa-dev, learn-medusa, ecommerce-storefront, medusa-cloud) is also roadmap v0.6.

**Why not 15/20**: No customer-facing on-call rotation. No incident response runbook with named on-call agents. No SLOs published. No customer success function (single HITL solo).

**Gate to 12/20** (v0.6): ADLC AI Gateway shipped (real code, not slides) — at least 1 agent invocation per customer-facing workflow, evidence: agent execution logs visible to customer admin.

**Gate to 15/20** (v0.7): named on-call + 24/7 incident response + published SLOs, evidence: incident drill executed end-to-end, MTTD/MTTR captured.

---

## Category 5: Go-to-Market Differentiation — 7 / 20

**Current**: Clear positioning ("quote-assisted B2B-Commerce for ANZ regulated industries"); 7-element unfair advantage stack defined; alpha customer OceanSoft validates the workflow; FOCUS 1.2+ + APRA CPS 234 wedge differentiates from Shopify Plus B2B / BigCommerce in regulator-anchored conversations.

**Why not 10/20**: 0 paying customers. 0 case studies. 0 proof-point benchmarks (e.g., "quote cycle reduced from X weeks to Y days"). No public press / analyst coverage. No partner channel (no SI / ISV partners signed).

**Why not 13/20**: ANZ Energy / FSI / Telecom credibility is roadmap, not booked — claimed via HITL background, not via signed customer references. Demo environment for prospects not yet packaged (DC-040 documentation pack is Phase 1 enabler but not GTM-grade).

**Gate to 10/20**: first paying customer logo + 1 proof-point case study (with quantified before/after), evidence: signed contract + customer-quoted KPI improvement.

**Gate to 13/20**: 3 paying customers across 2 verticals + analyst briefing completed (Gartner / IDC ANZ B2B commerce coverage), evidence: published analyst note OR Magic-Quadrant-style placement.

---

## Top 3 Risks to Enterprise GTM

### Risk 1 — No live AWS deployment yet (Phase 1 is validate-only)

**Severity**: High. Enterprise procurement asks "show me production" in week 2 of evaluation. We cannot show production today.

**Impact**: Disqualification from RFPs that require demonstrable production deployment.

**Mitigation**: Phase 1 evidence (working local stack + validating IaC + FOCUS-tagged infrastructure) is presented as "deployment-ready"; v0.3 deploy is gated on first paying customer commitment, accelerating the "talk → deploy" loop.

### Risk 2 — Single-region posture limits ANZ enterprise sales

**Severity**: Medium-High. APRA-regulated FSI buyers require data residency guarantees. ANZ enterprise default expectation: in-region primary + disaster recovery.

**Impact**: Loses deals to multi-region competitors at the technical-deep-dive stage.

**Mitigation**: Phase 2 v0.3 lands in customer-configured `$AWS_DEFAULT_REGION` (Sydney or Auckland region) explicitly. Multi-region warm standby is v0.5 — sequenced behind first paying customer.

### Risk 3 — ADLC AI Gateway marketing risk

**Severity**: Medium. The "AI-orchestrated procurement" narrative is differentiating but unbuilt. Claiming it as current capability is `NATO_VIOLATION` and erodes trust.

**Impact**: Sales conversations promise capability the product cannot demonstrate; customer disappointment at PoC; churn risk.

**Mitigation**: Documentation discipline (this assessment + [b2b-blueprint.md](./b2b-blueprint.md) roadmap matrix) explicitly labels AI Gateway as v0.6 aspirational. Sales materials inherit the same discipline.

---

## Gap Register (Severity-Ranked)

Phase 1 → Phase 2 production-readiness gaps. CRIT/HIGH block launch; MED post-launch acceptable; LOW deferred.

| Gap | Title | Severity | Story | Sprint | Owner | Status |
|---|---|---|---|---|---|---|
| G-01 | No production AWS account | **CRIT** | OS-003 | Sprint 0 | cloud-architect + HITL | BLOCKED |
| G-02 | No Stripe AU production approval | **HIGH** | OS-005 + OS-040 | S0 + S4 | HITL + devops-security-engineer | BLOCKED |
| G-03 | No Aurora SLv2 migration plan | MED | Month 2 | post-launch | cloud-architect | PLANNED |
| G-04 | No rollback rehearsal runbook | MED | OS-044 | Sprint 4 | sre-engineer | TODO |
| G-05 | Chat widget spec stub | MED | OS-032 | Sprint 3 | fullstack-engineer + ai-systems-architect | TODO |
| G-09 | No chat-spend metric | MED | OS-034 | Sprint 3 | observability-engineer | TODO |
| G-10 | No DORA baseline | MED | OS-042 | Sprint 4 | observability-engineer | TODO |
| G-06 | No canary deployment | LOW | Month 2 | post-launch | sre-engineer | DEFERRED |
| G-07 | No SBOM | LOW | Month 3 | post-launch | devops-security-engineer | DEFERRED |
| G-08 | No DAST | LOW | Month 3 | post-launch | security-compliance-engineer | DEFERRED |
| G-11 | No PII redaction | LOW | Month 2 | post-launch | security-compliance-engineer | DEFERRED |
| G-12 | No SOC2 attestation | LOW | Month 3 | post-launch | security-compliance-engineer | DEFERRED |

Severity gates: **CRIT** = blocks launch; **HIGH** = blocks sprint cutover; **MED** = post-launch acceptable; **LOW** = deferred. Status: 🔴 BLOCKED, 🟡 TODO, 🟠 IN PROGRESS, 🟢 DEFERRED, ✅ DONE.

---

## Post-Launch Enhancements (Month 2-3)

Backlog for production hardening after v1.0.0 launch.

| Phase | Task | Gap | Owner |
|---|---|---|---|
| Month 2 | RDS Aurora SLv2 migration runbook (trigger + cost) | G-03 | cloud-architect |
| Month 2 | Canary deployment strategy (weighted ALB targets) | G-06 | sre-engineer |
| Month 2 | PII redaction in CloudWatch Logs (SSM parameter + log policy) | G-11 | security-compliance-engineer |
| Month 2 | Per-customer cost attribution (FOCUS view with customer_id join) | G-02 (partial) | finops-engineer |
| Month 3 | SBOM generation (`trivy image scan` in CI) + GitHub release artifacts | G-07 | devops-security-engineer |
| Month 3 | DAST scan integration (OWASP ZAP weekly on staging) | G-08 | security-compliance-engineer |
| Month 3 | SOC2 audit readiness assessment + control documentation | G-12 | security-compliance-engineer |

---

## Next 3 Actions to Lift Readiness 20 Points

Sequenced. Each builds on the prior. Total expected lift: 50 → 69 within 1 quarter of Phase 1 completion (v1.1.0 closed the first +1 via test-harness design).

### Action 1 — Land Phase 1 evidence + v0.2 enablers (lift: +5 pts remaining)

Complete DC-001..DC-040 acceptance criteria; ship v0.2 increment (Stripe mock real + production seed data + companies REST API + admin spending-limit UI). Technical Architecture already at 12 (test-harness design lifted +1 in v1.1.0). Remaining lift: Product Capability 14→16 (companies API + admin UI) and Go-to-Market 7→9 (demo environment shippable).

Evidence: `task test:all` passes (RQ2 execution green twice); first prospect demo recorded.

### Action 2 — v0.3 single-AWS-account deployment with live audit logs (lift: +8 pts)

Deploy Phase 1 stack to one customer-controlled AWS account. RDS + ElastiCache + ECS Fargate (or EKS — CA decision). FOCUS 1.2+ tags live. Audit logs shipped to queryable store. APRA CPS 234 §36 evidence bundle generator runs on demand.

Lifts Technical Architecture 12→14, Compliance & Governance 9→12, Operating Model 8→10.

Evidence: `aws ec2 describe-instances --profile $AWS_OPERATIONS_PROFILE` returns running tasks; audit query "who approved quote X" returns full evidence.

### Action 3 — First paying customer + analyst briefing (lift: +6 pts)

Convert one ANZ Energy / FSI / Telecom prospect to paying customer. Capture proof-point: "quote cycle reduced from X weeks to Y days" with named customer (or anonymised case study with permission). Brief one ANZ analyst (Gartner / IDC AU/NZ) on the wedge.

Lifts Go-to-Market 9→13, Compliance & Governance 12→13 (audit-grade customer reference), Operating Model 10→11 (customer success function emerges).

Evidence: signed customer contract; published or analyst-acknowledged case study.

---

## Persona Coverage Note

This assessment scores the product as experienced by both primary personas:

- **Buyer-employee** (the spender): Product Capability score reflects whether they can request quotes, see approval status, and place approved orders without leaving the storefront. Today: yes for steps 1-3 of the canonical workflow.
- **Admin / sales-manager** (the gatekeeper): Product Capability score reflects whether they can review, negotiate, approve or reject, and audit every quote from one admin UI. Today: yes via `/admin/quotes` + approval workflows.

A scorecard that only measured the admin side would miss the user who triggers value. A scorecard that only measured the buyer-employee side would miss the audit-grade workflow that closes the regulator gap. Both personas are reflected in every category score above.

---

## Conclusion

50/100 is an honest Phase 1 score, not a discouraging one. The +1 from v1.1.0 is small by design — test-harness design without execution evidence warrants one point, not five. The category breakdown shows the path to 69 is sequenced and realistic within a quarter post-Phase 1. The gates are explicit; the risks are named; the next three actions are concrete. The number rises with evidence, not with marketing — that discipline is itself a differentiator in a category dominated by SaaS marketing.

This assessment is itself the evidence for DC-040 (documentation pack) and is re-scored each quarterly business review (`/ceremony:qbr`).
