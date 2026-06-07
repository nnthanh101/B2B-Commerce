---
title: "ADR-007: Grafana + Prometheus Observability (Local-First)"
description: Grafana + Prometheus is the hybrid-cloud vendor-neutral observability SSOT. CloudWatch is permanently rejected as SSOT. Local-first via docker-compose.observability.yml.
sidebar_position: 7
tags: [adr, observability, grafana, prometheus, hybrid-cloud, docker-compose]
source_refs:
  - path: "docs/architecture/ADR-007-grafana-prometheus-local-first.md"
    last_compiled: "2026-06-07"
  - path: "docker-compose.observability.yml"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# ADR-007: Grafana + Prometheus Observability Stack (Local-First)

**Status**: Accepted — AMENDED 2026-06-05 (hybrid-cloud premise; execution NOW)
**Date**: 2026-06-04 (amended 2026-06-05)
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`; amendment: `product-owner-2026-06-05-observability-rev.json` + `cloud-architect-2026-06-05-observability-rev.json`

## Key Amendment (2026-06-05)

**Trigger**: The platform is **hybrid-cloud (AWS + Azure)**, so CloudWatch is invalid as the observability SSOT (AWS-only; blind to Azure).

**Deltas**:
1. **CloudWatch is PERMANENTLY REJECTED as SSOT** — may remain a destination, never the source of truth.
2. **Execution: NOW** — 5 containers (`prometheus`, `grafana`, `postgres-exporter`, `redis-exporter`, `node-exporter`) in opt-in `docker-compose.observability.yml`.
3. **LGTM roadmap**: Prometheus (metrics) now; Loki (logs) + Tempo (traces) in later slices.
4. **Multi-cloud topology**: managed-per-cloud, federated. One primary managed Grafana (AMG or Azure Managed Grafana) as single pane of glass.

## Summary

B2B-Commerce uses **Prometheus + Grafana** for observability:
- **Phase 1**: Containers in `docker-compose.observability.yml` (opt-in overlay).
- **Phase 3**: Managed Grafana/Prometheus (AWS AMP+AMG federated with Azure Managed Grafana).

Key metrics: Medusa workflow lifecycle (quote timing), approval-flow SLA, cart-abandonment signals, FinOps cost-per-quote attribution.

## Opt-In Stack

```bash
# Start observability overlay (Prometheus + Grafana + exporters)
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
# Grafana: http://localhost:3000 (admin/<non-default from .env>)
# Prometheus: http://localhost:9090
```

## Cross-References

- [ADR-015](./ADR-015-local-first-terraform-iac.md) — Local-First Terraform IaC (CloudWatch module dropped)
- [ADR-016](./ADR-016-observability-under-infra.md) — Observability configs under `infra/`
