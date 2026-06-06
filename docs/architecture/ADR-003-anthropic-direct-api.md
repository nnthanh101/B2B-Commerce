# ADR-003: Anthropic Claude API Direct Integration

**Status**: Accepted (Phase 1, v0.1 baseline)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`

## Summary

B2B-Commerce integrates **Anthropic Claude API** (direct, not AWS Bedrock) as the canonical AI backbone for ADLC subagent orchestration and future AI-assisted procurement workflows. Phase 1 uses **Haiku 4.5 for low-cost operational agents** (inventory, validation, observability); **Sonnet / Opus are reserved for complex reasoning** (cost analysis, approval workflows) when triggered in Phase 2+. Cost tracking is enforced via API request tags (`Project`, `BillingTag`); every Claude API call logs to the FOCUS 1.2+ cost allocation stream. The decision defers AWS Bedrock in favour of direct Claude API for Phase 1 simplicity.

## Context

B2B-Commerce operates on an **ADLC v1.2.0 governance model** with one HITL manager and 38+ specialist AI agents. The orchestration surface needs:

- **Lightweight agent supervision** — read-first paradigm; HITL retains write-authority (git, apply, deploy)
- **Cost transparency** — every agent invocation must surface its API cost for FinOps accountability
- **Multi-model flexibility** — Haiku for fast operational tasks, Sonnet for complex analysis, Opus for rare high-stakes decisions
- **Compliance posture** — customer data is READONLY in Phase 1 (no sensitive information sent to Claude unless explicitly authorized by customer request)

Phase 1 today is local-first (no production traffic). AI integration is **aspirational at v0.6** per [b2b-blueprint.md](../b2b-blueprint.md); zero code is committed today. This ADR documents the strategic choice so v0.6 execution does not revisit the debate.

The two main alternatives were:

1. **AWS Bedrock** — managed API, same-region inference, unified billing with AWS account
2. **Anthropic Direct API** — highest model availability, lowest latency, transparent per-request pricing

## Decision

**Use Anthropic Claude API direct for all ADLC agent orchestration.** Specifically:

- **Phase 1 operational agents** (observability-engineer, developer-experience-engineer, qa-engineer): Haiku 4.5 for fast feedback loops (5s response targets)
- **Phase 2+ complex reasoning** (product-owner orchestration, cost analysis): Sonnet 4 ($3/1M input, $15/1M output); Opus 4 reserved for critical architectures
- **Cost tracking** — every request includes tags: `Project=b2b-commerce`, `Environment=dev|staging|prod`, `BillingTag=customer-oceansoft` (future multi-tenant), `ManagedBy=adlc`, `Compliance=APRA-CPS234`
- **Data handling posture** — Phase 1: READONLY-only agent supervision (agents read files, transcribe results, HITL makes write decisions). Phase 2+: optional customer-data analysis on explicit request with audit logging

**API Integration Specifics**:

- **Endpoint**: `api.anthropic.com/v1/messages`
- **Authentication**: `ANTHROPIC_API_KEY` environment variable (stored in `.env.local`, never committed)
- **Rate limits**: Phase 1 agent execution stays well below tier-1 (500 req/min); production escalation is roadmap
- **Error handling**: transient timeouts trigger exponential backoff (1s → 2s → 4s max); permanent API errors surface to HITL for manual review
- **Phase 2 v0.3 secret source**: `ANTHROPIC_API_KEY` sourced from AWS Secrets Manager (secret name `b2b-commerce/anthropic-api-key` per customer account). The Medusa backend resolves the secret at boot via the AWS SDK; no `.env`-file injection in Phase 2. KMS-managed encryption-at-rest applies (consistent with [ADR-002](./adr-002-rds-single-az.md) KMS posture). Audit trail: every secret retrieval logged to CloudTrail per APRA CPS 234 §36.

**ADLC Gateway Roadmap** (v0.6 — zero code today):

- Agent orchestrator middleware: route Haiku/Sonnet selection by task complexity
- Cost ledger: daily aggregate spend per agent per project
- Audit trail: every message recorded (for compliance, never for model training without opt-in)

Note: [ADR-007](./adr-007-grafana-prometheus-local-first.md) lands subagent observability metrics at v0.3; the AI Gateway proper (this decision) lands at v0.6.

## Consequences

**Accepted**:

- Direct API cost is transparent and auditable — no Bedrock pricing tiers or hidden seat costs.
- Latency baseline (80-120ms p50 for Haiku) supports sub-3-second agent responses in Phase 1.
- Model flexibility: as new Claude versions release, integration point is a single API endpoint (vs. Bedrock rollout delays).
- Customer data handling is explicit — Phase 1 defaults to READONLY; v0.2+ requires explicit authorization to analyse customer quotes.

**Trade-offs**:

- AWS-native observability (CloudWatch traces, X-Ray) is not automatic — ADLC logging must include request/response summary for cost reconciliation.
- Cross-region failover is customer's responsibility (multi-region agent setup in v0.4+); no built-in Bedrock regional failover.
- Anthropic API uptime SLA is published but not contractually backed (Bedrock offers AWS SLA coverage); Phase 1 acceptable risk for non-production; Phase 2 risk reassessed.

**Rejected**:

- **AWS Bedrock** — adds AWS auth complexity (cross-account assume-role) before Phase 2 deploy credentials are available. Phase 1 is validate-only; Bedrock integration defers to Phase 2 when AWS account is active.
- **Self-hosted LLM** (Llama, Mistral) — operational overhead (GPU infrastructure, model updates, prompt tuning) destroys Phase 1 time-to-demo. Acceptable in v1.0+ only if regulatory audit demands model sovereignty.
- **Multi-provider strategy** (Claude + OpenAI fallback) — increases cost surface and operational complexity. Single API (Claude) scales to Phase 1 + Phase 2 workloads.

## ANZ Regulatory Context

APRA CPS 234 §36 posture:

- **Data residency** — agent requests are dispatched to Anthropic's API (US-based). Customer-identifiable data is NOT sent to Claude unless the customer explicitly approves (Phase 1 READONLY default prevents this).
- **Audit trail** — all agent invocations are logged locally in `tmp/B2B-Commerce/coordination-logs/*.json` with timestamps, models used, and cost tags.
- **Opt-in model training** — Anthropic's default disables model training on API requests; ADLC maintains this posture (no future-model-improvement sharing without explicit data-licensing agreement).

## Cross-References

- [b2b-blueprint.md — ADLC AI Gateway v0.6 roadmap](../b2b-blueprint.md)
- [readiness-scorecard.md](../readiness-scorecard.md) — Phase 1 KPI gates
- [discovery-brief.md](../discovery-brief.md) — Evidence-first ADLC governance
- ADR-008: Medusa B2B Module Reuse (ADLC agents supervise deployment of these modules from v0.2+)
- ADR-009: Apps as First-Party Code (ADLC gateway integration target, v0.6)
- Project memory: `.claude/memory/MEMORY.md` (ADLC framework context)
