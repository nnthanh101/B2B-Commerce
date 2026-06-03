# Independent Assessment & Score — B2B Headless Commerce Blueprint

**Artifact under review:** [`docs/b2b-blueprint.md`](./b2b-blueprint.md) — _Business Proposal & Implementation Blueprint: Medusa B2B Starter vs Vercel Commerce_
**Reviewer:** Principal Cloud / DevSecOps Architecture (independent scoring pass)
**Date:** 2026-06-03
**Scoring lens:** **Implementation-readiness** — _"Can engineers build production FSI/Energy B2B commerce from this document as written?"_ This is an adversarial engineering review, not a board-marketing review. A document can be an excellent decision artifact and still be an incomplete build spec; this assessment separates the two.

---

## 0. Verdict (TL;DR)

|                                       |                                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overall score**                     | **79 / 100**                                                                                                                                                                 |
| **Grade**                             | **B+**                                                                                                                                                                       |
| **As a strategy & decision artifact** | **A− (excellent, approve the direction)**                                                                                                                                    |
| **As a build-ready engineering spec** | **C+ (not yet; ~12 gaps to close)**                                                                                                                                          |
| **Headline verdict**                  | **CONDITIONAL GO.** Approve Phase 0–1 today. Do **not** hand this to engineers as a Phase-2 AWS build spec until the High-severity gaps (G-01, G-02, G-04, G-05) are closed. |

**One-line summary:** The blueprint makes the _right_ platform decision for the _right_ reasons and is factually accurate where it matters, but it is one level of engineering detail short of buildable for the AWS, data-resilience, and AI-gateway layers.

**Phase-gated go/no-go** (the most useful output of this review):

| Phase                                       | Buildable from blueprint as-is? | Blocking gaps                                                                                       |
| ------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Phase 0** — Account & governance baseline | ✅ **GO**                       | None blocking; add cost envelope (G-01)                                                             |
| **Phase 1** — Local Medusa (Docker Compose) | ✅ **GO**                       | None — `b2b-starter` runs today                                                                     |
| **Phase 2** — AWS dev (Terraform)           | ⚠️ **NO-GO until fixed**        | G-02 (RDS HA/DR), G-03 (AppRegistry circular dep), G-04 (network topology), G-06 (TF state backend) |
| **Phase 3** — ADLC AI Gateway               | ⚠️ **PARTIAL**                  | G-05 (gateway tech stack), G-10 (agent eval set)                                                    |
| **Phase 4** — Pilot                         | ⚠️ Conditional                  | G-08 (SLOs/alarms), G-09 (compliance frameworks)                                                    |
| **Phase 5** — Prod hardening                | ⚠️ Conditional                  | G-02, G-07, G-09 mature here                                                                        |

---

## 1. Scoring method

Each of the 14 sections in the original checklist is scored **raw 0–10** for _implementation-readiness_ (clarity, completeness, testability, and whether an engineer could act on it without inventing missing decisions), then **weighted** by its impact on actually shipping the platform. Weights sum to 100. `Weighted = (raw / 10) × weight`.

Weighting bias under this lens: the layers that _block a build_ (AWS architecture, Terraform, AI gateway, FinOps sizing) carry more weight than narrative sections (presentation, RACI), which are necessary but not on the critical path to running software.

---

## 2. Scorecard

| #   | Dimension                       |  Weight | Raw /10 |  Weighted | Grade  | One-line rationale                                                                                     |
| --- | ------------------------------- | ------: | ------: | --------: | :----: | ------------------------------------------------------------------------------------------------------ |
| 1   | CEO/CFO/CTO executive narrative |       5 |     8.5 |      4.25 |   A−   | Clear, stakeholder-segmented, KPI-anchored. Not build-blocking.                                        |
| 2   | Weighted decision scorecard     |       6 |     7.0 |      4.20 |   B    | Conclusion correct; **methodology not reproducible** (self-scored, no per-score rubric).               |
| 3   | Medusa vs Vercel recommendation |       6 |     9.5 |      5.70 |   A    | **Verified accurate** — active `b2b-starter` vs deprecated `b2b-starter-medusa`. Sound reasoning.      |
| 4   | AWS target architecture         |      13 |     7.5 |      9.75 |   B+   | Right services, good principles; **no network/HA/sizing specifics**.                                   |
| 5   | Terraform module blueprint      |      12 |     7.0 |      8.40 |   B    | Good module decomposition; **misses AppRegistry circular-dep + state backend**.                        |
| 6   | ADLC AI-agent integration model |      10 |     8.5 |      8.50 |   A−   | Capability ladder + tool table + evidence schema are genuinely strong; **gateway tech stack unnamed**. |
| 7   | HITL & agent guardrails         |       8 |     9.0 |      7.20 |   A    | Best section. Read-first, policy-gated writes, backend-enforced authz. Buildable.                      |
| 8   | FinOps FOCUS 1.2+ cost model    |       9 |     7.5 |      6.75 |   B+   | Tag taxonomy + FOCUS alignment **verified**; **zero dollar baseline/sizing**.                          |
| 9   | Delivery roadmap                |       8 |     7.0 |      5.60 |   B    | Sensible phasing; **estimates lack team/throughput basis**, no INVEST stories.                         |
| 10  | Governance & RACI               |       4 |     8.5 |      3.40 |   A−   | Complete, sane accountability split.                                                                   |
| 11  | Risk register                   |       6 |     8.0 |      4.80 |   A−   | Good coverage + mitigations; could quantify exposure.                                                  |
| 12  | ADRs                            |       6 |     8.5 |      5.10 |   A−   | Proper ADR discipline; mark Proposed→Accepted on approval.                                             |
| 13  | Presentation narrative          |       3 |     8.0 |      2.40 |   A−   | Board-ready 10-slide story.                                                                            |
| 14  | Immediate next actions          |       4 |     8.0 |      3.20 |   A−   | Concrete, correctly sequenced first-10.                                                                |
|     | **TOTAL**                       | **100** |         | **79.25** | **B+** |                                                                                                        |

---

## 3. Technical-accuracy verification (trust, but verified)

Every load-bearing external claim was checked against primary sources. **All four verified true** — this is a well-researched document.

| Claim in blueprint                                                                                                       |   Verdict   | Evidence                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | :---------: | --------------------------------------------------------------------------------------------------------------------- |
| `medusajs/b2b-starter-medusa` is deprecated; use active `medusajs/b2b-starter`                                           | ✅ **True** | Deprecation/redirect confirmed on the repo; active starter is the Medusa + Next.js 15 monorepo.                       |
| Medusa B2B feature set (company mgmt, spending limits, approvals, quotes, order edit, bulk add-to-cart, promotions)      | ✅ **True** | Confirmed **verbatim** in the migrated `b2b-starter/README.md` and source tree (632 tracked files).                   |
| AWS myApplications/AppRegistry supports Terraform via `aws_servicecatalogappregistry_application` + `awsApplication` tag | ✅ **True** | AWS Cloud Operations Blog (Aug 2025). **Caveat the blueprint omits → see G-03.**                                      |
| FOCUS 1.2 Data Export is GA on AWS with hourly/daily/monthly granularity (`FOCUS_1_2_AWS` table)                         | ✅ **True** | AWS Cloud Financial Management — GA; adds `x_Discounts`, `x_Operation`, `x_ServiceCode`; 14 columns beyond FOCUS 1.0. |

**Net:** No factual corrections required. The score is _not_ discounted for inaccuracy — it is discounted for **missing engineering depth**, which is a different and fixable problem.

---

## 4. Implementation-Readiness Gap Register

Severity = blast radius on delivery. **Blocks** = the earliest phase that cannot complete until this is closed.

| ID       | Gap                                         |  Severity  |        Blocks        | What's missing                                                                                                                                                        | Concrete remediation                                                                                                                                                                                                                          | Owner           |
| -------- | ------------------------------------------- | :--------: | :------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **G-01** | No cost baseline / resource sizing          |  🔴 High   |       Ph0, Ph2       | FinOps taxonomy is strong but there are **zero dollar figures**, no RDS class, no Fargate vCPU/mem, no monthly run-rate. "Initial cost model" has no starting number. | Publish a sized Bill-of-Materials + monthly envelope per env (e.g. RDS `db.t4g.medium` Multi-AZ, 2× Fargate 0.5vCPU/1GB backend, 2× 0.25vCPU/0.5GB storefront, ALB, CloudFront, 1×NAT dev / 2×NAT prod) and a FOCUS-mapped 12-month forecast. | FinOps/CloudOps |
| **G-02** | RDS HA & DR unspecified                     |  🔴 High   |       Ph2, Ph4       | "RDS PostgreSQL" only. No Multi-AZ, PITR, backup retention, read replica, **no RPO/RTO targets**. DR is a single Phase-5 line.                                        | Specify Multi-AZ, automated backups 7–35d, PITR on, target **RPO ≤ 5 min / RTO ≤ 1 h**, and a scripted restore test as a Phase-4 exit gate.                                                                                                   | CloudOps/CTO    |
| **G-04** | Network topology undefined                  |  🔴 High   |         Ph2          | No VPC CIDR plan, subnet tiers, NAT design, or VPC-endpoint list — yet FinOps section flags NAT/data-transfer as top cost leak.                                       | Define 3-tier subnets (public ALB / private app / isolated data) across ≥2 AZs; single-NAT dev vs HA-NAT prod; VPC endpoints for S3/ECR/CloudWatch/Secrets to cut NAT egress.                                                                 | CloudOps        |
| **G-05** | ADLC AI Gateway not a buildable component   |  🔴 High   |         Ph3          | Tool list + evidence schema are good, but **model provider, runtime, policy-engine tech, and eval harness are unnamed** — the gateway is a black box.                 | Name the stack: model provider (Bedrock **or** Anthropic API), gateway as an ECS Fargate service, policy engine (OPA/Cedar), eval harness (e.g. promptfoo), per-tool/per-company token budgets enforced server-side.                          | AI/Platform     |
| **G-03** | AppRegistry ↔ Terraform circular dependency | 🟠 Medium  |         Ph2          | Self-applying the `awsApplication` tag from the same provider that creates the app causes a cycle — **not addressed**.                                                | Per AWS blog: use **two `aws` provider blocks** — one creates `aws_servicecatalogappregistry_application`, a second applies `default_tags = { awsApplication = <arn> }`; or bulk-onboard via an existing tag key.                             | CloudOps        |
| **G-06** | Terraform state backend not designed        | 🟠 Medium  |         Ph2          | "Remote state" named in next-actions but no S3 + DynamoDB lock, per-env isolation, or CI auth.                                                                        | Define S3 backend + DynamoDB lock table, per-env state keys, and **GitHub OIDC → AWS** (no long-lived keys) for plan/apply.                                                                                                                   | CloudOps        |
| **G-07** | Secrets rotation & KMS strategy thin        | 🟠 Medium  |       Ph2, Ph5       | KMS/Secrets Manager named; no rotation cadence or key scoping.                                                                                                        | Key-per-domain CMKs; Secrets Manager rotation (30–90 d) for DB creds; no plaintext secrets in task defs (inject via secret ARNs).                                                                                                             | Security        |
| **G-08** | Observability has no SLOs/alarm thresholds  | 🟠 Medium  |       Ph2, Ph4       | CloudWatch + OTel listed; "100% agent audit coverage" is a KPI with no instrumentation plan.                                                                          | Define SLIs/SLOs (API p95, checkout success rate, quote latency), concrete alarm thresholds, per-component dashboards, log-retention tiers.                                                                                                   | SRE             |
| **G-09** | Compliance frameworks unnamed               | 🟠 Medium  |       Ph4, Ph5       | "Regulated FSI/Energy" claimed but **no named control framework** (SOC 2 / ISO 27001 / PCI-DSS scope / GDPR residency / NERC CIP).                                    | Name target frameworks + a control-mapping matrix; define data residency; declare PCI scope (likely SAQ-A if card capture is PSP-hosted).                                                                                                     | Security/CTO    |
| **G-10** | Testing & agent-eval strategy thin          | 🟠 Medium  |       Ph1–Ph4        | "Integration tests" and "ADLC evals" named without contents, test-data, contract tests, or load plan.                                                                 | Add ERP/PIM **contract tests**, seed/test-data strategy, k6/Locust load plan, and a concrete agent eval set (golden tasks + red-team prompts) wired into the CI release gate.                                                                 | Engineering/AI  |
| **G-12** | Roadmap estimates lack capacity basis       | 🟠 Medium  |         Ph0          | 12–18 weeks with no team size, throughput, or INVEST backlog.                                                                                                         | Add team composition + throughput assumption; decompose to **INVEST stories** (now delivered in [`features.md`](../features.md)).                                                                                                             | Product/CTO     |
| **G-11** | Decision scorecard not reproducible         | 🟡 Low-Med | Decision credibility | Weights/scores asserted; no per-criterion rubric → confirmation-bias risk (91 vs 57).                                                                                 | Add a 1–10 rubric per criterion and cite evidence per row, **or** explicitly label it "expert judgment." Conclusion stands either way.                                                                                                        | Architecture    |

> **Critical (🔴) count: 0.** No gap is fatal to the _direction_. Four High-severity gaps gate the **Phase-2 AWS build**, which is exactly where an unmodified strategy doc tends to fail.

---

## 5. What's strong — preserve these

These are above the bar for the document type and should **not** be diluted in revision:

1. **Correct, verified platform decision.** Choosing the active `b2b-starter` over the deprecated repo — and using Vercel Commerce as UX reference only — is the right call and is now factually locked.
2. **AI capability ladder (L0–L5) + HITL gating + evidence event schema.** This is the best-engineered part of the document: read-first by default, write actions policy-gated, approvals never autonomous, every tool call emits auditable evidence with input/output hashes and trace IDs. It is directly buildable.
3. **Explicit MVP non-goals** (no EKS/Kafka/OpenSearch/multi-region on day one). Naming what you will _not_ build is a senior engineering signal and the single biggest cost and timeline de-risker here.
4. **FOCUS-aligned tag taxonomy.** The 12-tag set (incl. `awsApplication`, `Component`, `BusinessCapability`, `DataClassification`) is comprehensive and maps cleanly to unit-economics views — once sizing numbers (G-01) are added.
5. **ADR + RACI + risk discipline.** The governance scaffolding is complete enough to run the program from.

---

## 6. Top 6 must-fix before Phase 2 (the critical path)

In priority order, these convert the document from "approved strategy" to "engineering build spec":

1. **G-01** — Sized BoM + dollar envelope (unblocks CFO sign-off _and_ the whole "cost-effective 2026–2030" goal).
2. **G-04** — VPC/subnet/NAT/endpoint topology (everything in Terraform depends on it).
3. **G-02** — RDS Multi-AZ + RPO/RTO + restore test (non-negotiable for FSI/Energy).
4. **G-03 + G-06** — AppRegistry dual-provider pattern + S3/DynamoDB state backend + OIDC (the two things that will actually break `terraform apply`).
5. **G-05** — Name the AI Gateway stack (unblocks Phase 3).
6. **G-09** — Name the compliance framework(s) (turns "regulated" from a claim into a scope).

---

## 7. Sources

1. Medusa active B2B Starter — <https://github.com/medusajs/b2b-starter>
2. Medusa legacy (deprecated) B2B starter — <https://github.com/medusajs/b2b-starter-medusa>
3. Medusa B2B Starter update (Mar 2025) — <https://medusajs.com/blog/b2b-starter-update-mar25/>
4. AWS — Getting started with myApplications for Terraform-managed applications — <https://aws.amazon.com/blogs/mt/getting-started-with-myapplications-for-terraform-managed-applications/>
5. AWS Service Catalog AppRegistry — `awsApplication` tag — <https://docs.aws.amazon.com/servicecatalog/latest/arguide/existing-customer-usecases.html>
6. AWS — Data Exports for FOCUS 1.2 is now generally available — <https://aws.amazon.com/blogs/aws-cloud-financial-management/data-exports-for-focus-1-2-is-now-generally-available/>
7. AWS — FOCUS 1.2 with AWS columns (table dictionary) — <https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws.html>
8. FinOps Foundation — FOCUS Specification v1.2 — <https://focus.finops.org/focus-specification/v1-2/>

---

Scored under an implementation-readiness lens. A board-readiness re-score of the same document would land ~6–8 points higher, because the narrative, decision, and governance sections are stronger than the build-spec sections. Both lenses agree on the action: **approve the direction, fund Phase 0–1 now, close the High-severity gaps before the AWS build.**
