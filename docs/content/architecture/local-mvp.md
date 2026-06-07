---
title: Local MVP Topology
description: Phase 1 four-service docker-compose topology reference for B2B-Commerce local development.
sidebar_position: 2
tags: [architecture, docker-compose, local-dev, topology, phase-1]
source_refs:
  - path: "docs/architecture/local-mvp.md"
    last_compiled: "2026-06-07"
  - path: "docker-compose.yml"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Local MVP — Phase 1 Topology Reference

> **Status**: Phase 1 — local-first 4-service docker-compose. NO AWS provisioning.
> **Authority**: `tmp/B2B-Commerce/coordination-logs/cloud-architect-batch-3-ca-2026-06-04.json`

## Overview

Phase 1 is the **local-first B2B skeleton** — every developer brings the full stack online via `task up`, no AWS account required. Phase 2 (v0.3) lifts these four services onto a single AWS account with no application-layer changes.

## Topology — 4 Services

```
+----------------------------------------------------------+
|  Network: ec_network_b2b (single bridge)                 |
|                                                          |
|  ec_postgres_b2b              ec_redis_b2b               |
|  postgres:15-alpine           redis:7-alpine             |
|  :5432                        :6379                      |
|  volume: postgres_data_b2b    (ephemeral)                |
|          ^                          ^                    |
|          | DATABASE_URL             | REDIS_URL          |
|  ec_backend_b2b (depends_on both)                        |
|  Medusa 2.x API + Admin                                  |
|  :9000 (admin+API), :5173 (Vite dev SDK)                 |
|          ^                                               |
|          | NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://ec:9000  |
|  ec_storefront_b2b                                       |
|  Next.js 15 storefront                                   |
|  :8000                                                   |
+----------------------------------------------------------+
```

| Service | Container | Image | Ports | Purpose |
|---------|-----------|-------|-------|---------|
| `postgres` | `ec_postgres_b2b` | `postgres:15-alpine` | `5432:5432` | Primary data store + FTS ([ADR-005](./adrs/ADR-005-postgres-full-text-search.md)) |
| `redis` | `ec_redis_b2b` | `redis:7-alpine` | `6379:6379` | Session + cache + workflow lock |
| `ec` | `ec_backend_b2b` | `build: .` (Medusa 2.x) | `9000:9000`, `5173:5173` | API + admin UI + workflow engine |
| `storefront` | `ec_storefront_b2b` | `build: .` (Next.js 15) | `8000:8000` | Buyer + merchant UI |

**Named volume**: `postgres_data_b2b` persists across `docker-compose down`; intentionally lost on `down -v`.

**Redis is ephemeral** — no named volume; session loss on restart is acceptable at Phase 1.

## Quick Reference

```bash
task up          # Start all 4 services (builds images if needed)
task down        # Stop and remove containers
task logs        # Stream live logs
docker compose ps   # Show container status
```

## Phase 1 → Phase 2 Transition

No application-layer changes required to promote from docker-compose to AWS. Same container images, same Postgres 15, same Redis 7. Terraform swaps the provider endpoint from LocalStack to real AWS. See [ADR-001](./adrs/ADR-001-single-aws-account.md) for the transition table.

## Terraform (validate-only at Phase 1)

Phase 1 runs Terraform in validate-only mode via `nnthanh101/terraform:2.6.0` container. No provider credentials wired; `terraform validate` + `infracost breakdown` prove the FOCUS 1.2+ tag set is wired at $0 cost. See [ADR-015](./adrs/ADR-015-local-first-terraform-iac.md).
