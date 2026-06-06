# CLAUDE.md — B2B-Commerce Consumer Guide

This file provides guidance to Claude Code when working with this repository.

## Identity

**B2B-Commerce is a CONSUMER of the ADLC framework and the Commerce plugin.**

- **Product**: B2B-Commerce platform (OceanSoft, NZ — NZD pricing, local-first Docker Compose)
- **Framework home**: [1xOps/adlc-framework](https://github.com/1xOps/adlc-framework) (PRIVATE/enterprise)
- **Commerce plugin**: `/Volumes/Working/projects/adlc-framework/.claude/plugins/commerce` (PRIVATE)
- **This repo**: [nnthanh101/B2B-Commerce](https://github.com/nnthanh101/B2B-Commerce) (MIT Licensed)

---

## 4-Layer Architecture Map

| Layer | Path | Source Repository | Visibility | Role | Edit Policy |
|-------|------|-------------------|-----------|------|-------------|
| **Framework Governance** | `.adlc/` + `.claude/` (symlinks) | `1xOps/adlc-framework` | **PRIVATE** | ADLC agents, commands, hooks, rules, skills | NEVER edit here; edit in framework repo |
| **Commerce Plugin** | `.adlc/.claude/plugins/commerce/` | `1xOps/adlc-framework` | **PRIVATE** | B2B commerce ADLC skills, `/commerce:*` commands, agents | NEVER edit here; edit in framework repo |
| **Product Code** | `apps/backend/` + `apps/storefront/` | This repo | MIT Licensed | Medusa v2 backend + Next.js 15 storefront | PRODUCT TEAM: full autonomy |
| **Product Docs** | `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`, `docs/` | This repo | MIT Licensed | B2B commerce user guides, release notes | PRODUCT TEAM: full autonomy |
| **Infrastructure Code** | `infra/`, `observability/`, + `terraform-aws/` submodule | `nnthanh101/terraform-aws` (PUBLIC) | MIT Licensed | IaC for AWS deployment (consumed as git submodule) | INFRASTRUCTURE TEAM: public repo; coordinate for changes |

---

## Public/Private Boundary — Critical Governance

**BLOCKING RULE**: Never commit `.adlc/`, `.claude/`, or adlc-framework content into a public repository.

| Repository | License | Boundary | Policy |
|------------|---------|----------|--------|
| **nnthanh101/B2B-Commerce** (this repo) | MIT | Product code + public IaC | Safe to mirror publicly; code/docs are unrestricted |
| **nnthanh101/terraform-aws** (submodule) | MIT | Public IaC modules | Safe to mirror publicly; any contributor can clone and use |
| **1xOps/adlc-framework** (symlinked in `.adlc/`) | PRIVATE | Governance, agents, skills, hooks | Enterprise-only IP; NEVER commit to B2B-Commerce public mirror |
| **1xOps/adlc-framework/.claude/plugins/commerce** | PRIVATE | Commerce-specific skills, commands | Enterprise-only IP; NEVER commit to B2B-Commerce public mirror |

**Rationale**: ADLC framework is proprietary 1xOps infrastructure for multi-agent governance. Public mirror of B2B-Commerce must have `.adlc/` and `.claude/` in `.gitignore`. The product code and public IaC submodule are safe; the framework is not.

---

## Consumer Rules

Governance rules come from the shared `.claude/` (do NOT duplicate framework rules here). This section adds ONLY product-specific context.

### Coordination Protocol

- **Framework rules apply**: PO + CA coordination mandatory for architecture/design decisions (see `.adlc/.claude/rules/governance/adlc-governance.md`)
- **Local-dev mutations are autonomous**: `task up`, `task seed`, `task test:*` run without HITL confirmation (see `.adlc/.claude/rules/governance/single-hitl-autonomy.md`)
- **NZD pricing**: All cost/budget references use NZD (see `.env.template` for defaults)

### Available Commands

All `/commerce:*` commands from the Commerce plugin are available via the symlinked `.claude/` — no extra setup needed. Examples:

```bash
# Start the stack (autonomous)
task up

# Seed the database with sample companies, quotes, approvals
task seed

# Run E2E test suite
task test:e2e

# Storefront diagnostic (self-Q&A for common issues)
/commerce:storefront-doctor
```

### Quality Standards

- **Test tiers**: 4-tier suite (Tier 1 static → Tier 3a HTTP → Tier 3b E2E → Tier 4 visual verification)
- **Visual-content gate**: Passing E2E tests do NOT prove UI correctness; screenshots/visual verification required before "done" claims (see `.adlc/.claude/rules/engineering/visual-content-verify-gate.md`)
- **Idempotency**: All operations support `task test:idem` (run twice, both exit 0)
- **Docker-first**: `docker-compose.yml` is the source of truth for service definitions; dev-container `.devcontainer/devcontainer.json` mirrors it

### Architecture Decisions

- **Medusa v2.15+**: Backend framework (Node.js 22, TypeScript, tRPC)
- **Next.js 15**: Storefront framework (React 19, TypeScript, Tailwind)
- **PostgreSQL 15-alpine + Redis 7-alpine**: Data + cache (local Docker, AWS RDS/ElastiCache on deployment)
- **Local-first B2B modules**: company, quote, approval are built directly into `apps/backend/src/modules/` — no separate packages today
- **Container naming**: `ec_*_b2b` prefix (product-flavor, operator-overridable via `COMPOSE_PROJECT_NAME`)

---

## Quick-Start Pointers

**For developers**:
```bash
task up                      # Start all services
task seed                    # Populate sample data
task test:e2e               # Run E2E smoke tests
task logs                   # Tail service logs
task down                   # Stop all services
```

**For operations**:
```bash
task tf:validate            # Validate Terraform structure (Phase 1: no AWS provisioned)
task tf:cost                # Infracost breakdown (Phase 1: $0)
```

**For debugging**:
```bash
/commerce:storefront-doctor # Self-guided troubleshooting for common issues
docker compose restart      # Reset containers (use --force-recreate to reload env files)
```

---

## References

- **Framework coordination**: `.adlc/.claude/rules/governance/adlc-governance.md`
- **Autonomous execution rules**: `.adlc/.claude/rules/governance/single-hitl-autonomy.md`
- **Coding discipline**: `.adlc/.claude/rules/engineering/coding-discipline.md`
- **Visual-content verification**: `.adlc/.claude/rules/engineering/visual-content-verify-gate.md`
- **Constitution**: `.adlc/.specify/memory/constitution.md` (7 ADLC principles)
- **Project memory**: `.claude/memory/MEMORY.md` (project-specific lessons learned)

---

**Last updated**: 2026-06-07
