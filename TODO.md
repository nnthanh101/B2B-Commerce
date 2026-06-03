# TODO — Technical, Infrastructure & Utilities Backlog

Engineering work that is **not** a user-facing story (those live in [`features.md`](./features.md)). Items tagged **[G-xx]** map to gaps in [`docs/ASSESSMENT.md`](./docs/ASSESSMENT.md). Priority: 🔴 high · 🟠 medium · 🟡 low.

---

## 0. Repo & foundation housekeeping

- [ ] Push the `b2b` branch to `origin` (`git push -u origin b2b`) and open a PR into `main`.
- [ ] Add branch protection on `main`/`b2b` (required reviews, status checks, no force-push).
- [ ] Add root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- [ ] Add `.editorconfig`, root `prettier`/`eslint` config, commit-lint + conventional commits.
- [ ] Wire CI: install → lint → typecheck → unit → `test:integration:http` on PR.
- [ ] Add a fresh `.gitpod.yml`/devcontainer pointing at the new `apps/*` layout (replaces the removed 2022 one).

## 1. Phase 0 — AWS account & governance baseline

- [ ] New AWS account; **IAM Identity Center / SSO**; break-glass role + process.
- [ ] **CloudTrail** (org trail), **AWS Config**, **GuardDuty**, **Security Hub** enabled.
- [ ] **AWS Budgets** + budget alarms per environment.
- [ ] Cost allocation tags activated; tag policy defined.
- [ ] **Terraform remote state** — S3 bucket + DynamoDB lock table, per-env state keys. **[G-06]** 🔴
- [ ] **AppRegistry / myApplications** application created via Terraform. **[G-03]** 🟠
- [ ] **FOCUS 1.2** Data Export configured (hourly/daily granularity) to S3 + Athena/Glue. **[G-01]** 🔴
- [ ] **GitHub OIDC → AWS** federation for CI (no long-lived keys). **[G-06]** 🔴

## 2. Phase 2 — Terraform modules (AWS dev)

- [ ] `appregistry` — application + **dual `aws` provider pattern** to self-apply `awsApplication` tag without circular dependency. **[G-03]** 🟠
- [ ] `network` — VPC CIDR plan, 3-tier subnets (public/private/isolated) across ≥2 AZs, NAT strategy (1× dev / HA prod), VPC endpoints (S3, ECR, CloudWatch, Secrets). **[G-04]** 🔴
- [ ] `security-baseline` — KMS (key-per-domain), IAM permission boundaries, least-privilege task roles. **[G-07]** 🟠
- [ ] `ecs-service` — reusable Fargate service (task/exec roles, autoscaling, log group) for backend / storefront / ai-gateway / worker.
- [ ] `rds-postgres` — **Multi-AZ**, automated backups (7–35d), PITR, parameter group, alarms; document **RPO ≤ 5 min / RTO ≤ 1 h** + scripted restore test. **[G-02]** 🔴
- [ ] `redis` — ElastiCache, only when session/cache/job load justifies it.
- [ ] `cloudfront-waf` — distribution, AWS managed WAF rule groups, TLS, origin access, security headers.
- [ ] `eventing` — EventBridge bus, SQS queues + DLQs, retry policies.
- [ ] `observability` — dashboards, alarms, log retention tiers, OTel collector. **[G-08]** 🟠
- [ ] `finops-focus-export` — export bucket, Glue/Athena, reporting views; sized **Bill-of-Materials + monthly $ envelope** per env. **[G-01]** 🔴

## 3. Phase 3 — ADLC AI Gateway

- [ ] Choose & document the gateway stack: model provider (Bedrock **or** Anthropic API), runtime (ECS Fargate), policy engine (OPA/Cedar), eval harness (e.g. promptfoo). **[G-05]** 🔴
- [ ] Implement read-first tools: `search_catalog`, `get_product_details`, `get_company_policy`, `get_quote_status`.
- [ ] Implement policy-gated write tools: `draft_quote_request`, `submit_quote_request` (HITL), `create_support_case`.
- [ ] Server-side ABAC/RBAC per company/role/tenant on every tool; never trust prompt-only auth.
- [ ] Evidence pipeline → S3 (schema from blueprint §6); partitioning + lifecycle to cold/archive.
- [ ] Per-agent / per-user / per-company token & cost budgets enforced server-side.
- [ ] Agent eval set (golden tasks + red-team prompts) as a CI release gate. **[G-10]** 🟠

## 4. Quality, security & compliance

- [ ] ERP/PIM/CRM adapter **contract tests**; seed/test-data strategy. **[G-10]** 🟠
- [ ] Load/perf plan (k6 or Locust) for catalog, cart, checkout, quote.
- [ ] Secrets Manager rotation (30–90d) for DB creds; no plaintext secrets in task defs. **[G-07]** 🟠
- [ ] Name target compliance frameworks (SOC 2 / ISO 27001 / PCI-DSS scope / GDPR residency / NERC CIP) + control-mapping matrix. **[G-09]** 🟠
- [ ] Dependency, IaC, secret, and container scanning in CI; enforce required FinOps tags on `terraform plan`.
- [ ] Threat model for quote-to-order + AI tool surface.

## 5. FinOps & cost discipline

- [ ] Sized cost model with real $ figures per env (dev/staging/prod) + 12-month forecast. **[G-01]** 🔴
- [ ] Non-prod scale-down / off-hours schedule.
- [ ] NAT/data-transfer minimization via VPC endpoints; monitor as top leak.
- [ ] CFO dashboard: cost per quote / order / company / agent interaction.

## 6. Decision-quality follow-ups

- [ ] Add a reproducible 1–10 rubric to the blueprint decision scorecard (or label "expert judgment"). **[G-11]** 🟡
- [ ] Flip ADRs from `Proposed` → `Accepted` once leadership approves.
- [ ] Add team composition + throughput assumption behind the 12–18 week roadmap. **[G-12]** 🟠

---

_Critical path before the Phase-2 AWS build: **G-01, G-04, G-02, G-03+G-06, G-05, G-09** (see ASSESSMENT §6)._
