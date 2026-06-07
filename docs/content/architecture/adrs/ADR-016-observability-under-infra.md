---
title: "ADR-016: Runtime Observability Configs Under infra/"
description: Grafana and Prometheus runtime configs moved from repo root to infra/observability/ for single-tree progression from local to cloud.
sidebar_position: 16
tags: [adr, observability, grafana, prometheus, infra, docker-compose]
source_refs:
  - path: "docs/architecture/ADR-016-observability-under-infra.md"
    last_compiled: "2026-06-07"
  - path: "infra/observability/"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# ADR-016: Runtime Observability Configs Consolidated Under `infra/`

**Status**: Accepted
**Date**: 2026-06-07
**Deciders**: infrastructure-engineer, cloud-architect, HITL
**Relates to**: [ADR-007](./ADR-007-grafana-prometheus-local-first.md), [ADR-015](./ADR-015-local-first-terraform-iac.md)

## Context

After ADR-007's amendment introduced the opt-in `docker-compose.observability.yml` overlay with five containers, Grafana and Prometheus runtime configs were placed at the repository root as `observability/`. This created a split mental model — runtime configs at root, IaC under `infra/`.

## Decision

Move runtime observability configs from root to `infra/`:

```
observability/           →   infra/observability/
  grafana/               →     grafana/
  prometheus/            →     prometheus/
    prometheus.yml       →       prometheus.yml
```

Update `docker-compose.observability.yml` volume mounts from `./observability/...` to `./infra/observability/...`.

## Consequences

**Accepted**: One `infra/` tree; cleaner root; promotion alignment (local runtime configs one level above Terraform observability module). Tests unaffected (Grafana accessed over HTTP only).

**Trade-offs**: `docker-compose.observability.yml` volume paths updated. Engineers with cached shell history get an immediate volume mount error (self-correcting).

**Rejected**: Leave at root (perpetuates split mental model), move under `infra/terraform/aws/` (non-HCL files in Terraform tree).

## Blast Radius

| File | Change |
|------|--------|
| `observability/` (root) | Renamed to `infra/observability/` |
| `docker-compose.observability.yml` | 4 volume path lines updated |
| `CLAUDE.md` | 1-line edit in 4-layer table |
| `docs/architecture/ADR-007-...` | 1-line historical path ref updated |

## HITL Action Required

The volume path changes in `docker-compose.observability.yml` were hook-blocked. HITL must apply:

```bash
# Verify the 4 lines that need updating:
grep -n "infra/observability" docker-compose.observability.yml

# Verify compose resolves:
docker compose -f docker-compose.observability.yml config --quiet && echo "PASS"
```

## Cross-References

- [ADR-007](./ADR-007-grafana-prometheus-local-first.md) — original observability decision
- [ADR-015](./ADR-015-local-first-terraform-iac.md) — IaC context
