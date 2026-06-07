---
title: "ADR-015: Local-First Terraform IaC Foundation"
description: Terraform with LocalStack Community for local-first IaC validation. Same modules promote to real AWS by swapping endpoints.
sidebar_position: 15
tags: [adr, terraform, localstack, aws, iac, focus-tags, s3-state]
source_refs:
  - path: "docs/architecture/ADR-015-local-first-terraform-iac.md"
    last_compiled: "2026-06-07"
  - path: "infra/terraform/aws/"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# ADR-015: Local-First Terraform IaC Foundation (LocalStack → AWS)

**Status**: Accepted (Phase 1 foundation slice; v0.3 real-AWS provisioning)
**Date**: 2026-06-05
**Consensus**: PO+CA **93%** (Option A "superset on plugin base")
**Authority**:
- `tmp/B2B-Commerce/coordination-logs/product-owner-2026-06-05.json`
- `tmp/B2B-Commerce/coordination-logs/cloud-architect-2026-06-05.json`

## Summary

B2B-Commerce provisions AWS infrastructure with **Terraform, local-first via LocalStack Community**. Same modules promote to real AWS by swapping provider endpoints + one feature flag — no rewrite.

Key decisions:
1. **Commerce-plugin FOCUS 1.2+ tag SSOT** (8 manual + 1 auto-injected tag) as a superset base
2. **Per-env-root-module layout** under `infra/terraform/aws/<env>/`
3. **Foundation slice** applicable on LocalStack Community end-to-end
4. **S3-native state backend** (`use_lockfile`, no DynamoDB)
5. **AppRegistry (AWS myApplications)** as a count-guarded, AWS-only module

## FOCUS 1.2+ Tag Schema (8 manual + 1 auto-injected)

| Tag | Value Pattern | FOCUS Mapping |
|-----|--------------|---------------|
| `Owner` | `team-commerce@oceansoft.io` | Support Group |
| `CostCenter` | `CC-COMMERCE-001` | FOCUS BilledCost rollup |
| `Service` | `backend\|storefront\|data\|edge\|async` | FOCUS group-by axis |
| `Application` | `b2b-commerce` | AppRegistry/FOCUS ServiceName |
| `Environment` | `dev\|staging\|prod` | Deployment scope |
| `ManagedBy` | `terraform` | Automation provenance |
| `Compliance` | `APRA-CPS234\|N/A` | GRC control scope |
| `DataClassification` | `internal\|customer\|pii` | Data governance |
| *(auto)* `Terraform` | `true` | Injected by provider `default_tags` |

## Directory Layout

```
infra/terraform/aws/
├── bootstrap/          # Creates S3 state bucket (local backend, run once)
├── modules/            # Shared modules (tags, foundation, observability, etc.)
├── local/              # LocalStack root module (foundation slice)
├── dev/                # Real-AWS dev root module
├── staging/            # Plan-only (deferred v0.3)
└── prod/               # Plan-only (deferred v0.3)
```

## Validated on LocalStack

Proven 9/9: S3 state bucket bootstrap → `terraform init` → `terraform apply` on LocalStack → `awslocal s3api head-object` state-object-lands.

## Cross-References

- [ADR-001](./ADR-001-single-aws-account.md) — Single AWS Account
- [ADR-006](./ADR-006-tag-only-github-actions.md) — S3-native lock + OIDC CI
- [ADR-007](./ADR-007-grafana-prometheus-local-first.md) — Observability (CloudWatch module dropped)
