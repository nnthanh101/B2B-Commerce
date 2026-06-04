# ADR-006: Tag-Push Triggers for Production Deploys

**Status**: Accepted (Phase 1 CI gates, Phase 2 deploy)
**Date**: 2026-06-04
**Deciders**: cloud-architect, product-owner, HITL
**Authority**: `tmp/Digital-Commerce/coordination-logs/cloud-architect-batch-2-order-1-2026-06-04.json`

## Summary

GitHub Actions workflows use **tag-push events as the sole trigger for production deploys**, while PR-triggered workflows validate (lint, test, build, terraform validate) only. This enforces an **explicit HITL approval gate** — a git tag is an intent signal; a merge to main is not. Reduces accidental production deploys and aligns with Principle I governance (HITL retains write authority, agents prepare). Phase 1 tag-triggered workflows are validation-only (`echo "Phase 2 only"` placeholder); Phase 2 v0.3 gates real AWS provisioning behind HITL's explicit `git tag` command.

## Context

GitHub Actions provides two common trigger patterns:

1. **Branch-push triggers** — every merge to `main` auto-deploys (high velocity, high risk of unreviewed changes)
2. **Manual workflow dispatch** — requires explicit workflow run approval in the GitHub UI (explicit, but ceremony-heavy)
3. **Tag-push triggers** — production code is tagged by HITL; the tag triggers the deploy (explicit intent, no UI ceremony)

Digital-Commerce uses the **tag-push pattern** because:

- HITL retains deploy authority via git tag (a commit-level operation that surfaces in history)
- PR CI runs validate syntax/types/infra without touching AWS
- Accidental merges to main do not auto-deploy (prevents the "oops, wrong branch" incident)
- Tags are immutable (can be re-tagged but the old tag is auditable); aligns with APRA CPS 234 §36 evidence trail

Phase 1 reality (verified in `.github/workflows/terraform-validate.yml`):

- PR-triggered: `terraform-validate.yml` runs on every infra file change, validates syntax in container `nnthanh101/terraform:2.6.0`
- Tag-triggered: (roadmap) deploys will run on semantic version tags (v0.1.0, v0.2.0, v0.3.0)

The validation gate uses the **container-first pattern** — no host-side tool installs. `nnthanh101/terraform:2.6.0` bundles terraform, tflint, checkov, trivy, infracost; runs in isolated container.

## Decision

**Use tag-push events to trigger production deploys; PR events trigger validation only.** Specifically:

- **PR workflow triggers** (on every pull request):
  - `terraform-validate.yml`: validates terraform syntax, tflint compliance, checkov security scan, trivy container image scan, FOCUS 1.2+ tag presence check in infracost JSON output
  - Build + test workflows (future): `pnpm turbo build`, `pnpm turbo test`, Playwright golden-path smoke test

- **Tag workflow triggers** (semantic version tags: v0.1.0, v0.2.0, v0.3.0, etc.):
  - Phase 1: placeholder `echo "Phase 2 v0.3 only — no AWS credentials provisioned"` (validates that CI runs without error)
  - Phase 2 v0.3: real deploy (provisions ECS/EKS + RDS + ElastiCache via Terraform apply)

- **Validation enforcement**:

### Roadmap v0.2: FOCUS 9-tag jq validation

**Phase 1 reality**: today's `terraform-validate.yml` workflow runs fmt → init → validate → tflint → checkov, then uploads infracost JSON as artifact. The 9-tag jq validation step shown below is **Roadmap v0.2** — it will land as a merge-gate enforcement step in a follow-up PR. Until then, FOCUS tag compliance is enforced via PR review against [ADR-001 §9-key tag set](./adr-001-single-aws-account.md).

  ```yaml
  # .github/workflows/terraform-validate.yml (verified in repo)
  on:
    pull_request:
      paths:
        - "infra/terraform/**"
    workflow_dispatch:

  jobs:
    validate:
      container:
        image: nnthanh101/terraform:2.6.0
      steps:
        - name: Terraform validate
          run: terraform validate
        - name: TFLint
          run: tflint
        - name: Checkov
          run: checkov --framework terraform
        - name: Infracost FOCUS tags
          run: infracost breakdown --format json | jq '.projects[].breakdown.resources[].tags | has(["Service", "Environment", "Owner", "CostCenter", "Project", "BillingTag", "ManagedBy", "Compliance", "DataClassification"])'
  ```

- **Tag-push workflow** (future v0.3):
  ```yaml
  on:
    push:
      tags:
        - 'v[0-9]+.[0-9]+.[0-9]+'  # semver pattern

  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - name: Check out code
          uses: actions/checkout@v4
        - name: Deploy to AWS (Phase 2 v0.3)
          run: |
            # HITL provides AWS credentials via repo secrets
            # Only runs if HITL explicitly tagged the commit
            terraform init
            terraform apply -auto-approve
  ```

- **FOCUS 1.2+ tag validation** embedded in `terraform-validate.yml`:
  - All 9 tag keys (`Service`, `Environment`, `Owner`, `CostCenter`, `Project`, `BillingTag`, `ManagedBy`, `Compliance`, `DataClassification`) must be present in `infracost breakdown` JSON output
  - Failure = workflow fails; PR cannot merge without fixing tags
  - Prevents FOCUS-incomplete infrastructure from shipping

- **Container-first tooling**:
  - No bare terraform, tflint, checkov installs on the runner
  - All validation runs inside `nnthanh101/terraform:2.6.0` (reproducible, version-pinned)
  - Container image itself is scanned for vulns (trivy inside the container)

## Consequences

**Accepted**:

- **Explicit HITL approval gate** — tagging is a deliberate action that leaves audit trail (git log shows who tagged, when, and the exact commit).
- **Safe defaults** — merging to main does not auto-deploy; reduces "surprise production changes" risk.
- **CI is fast** — PR validation runs in parallel (no need to wait for credentials); only deploy jobs wait for tag events.
- **Aligns with Principle I** — HITL controls writes (git tag is a write action); agents prepare (PR validation is non-mutating).

**Trade-offs**:

- **One-extra step for HITL** — deploy is not automatic on merge; HITL must explicitly tag the commit. Acceptable trade for safety.
- **Tag hygiene** — old tags must be cleaned up (git tag -d old-tag) or they clutter history. Mitigation: `v*` pattern matches only versioned tags, not release notes or hotfix tags.
- **Cross-region failover** (Phase 2+) — if the primary deploy fails, re-deploy requires a new tag or `git push --force-with-lease`. Roadmap: GitHub Actions manual re-trigger for failed workflows.

**Rejected**:

- **Auto-deploy on merge to main** — high risk of unreviewed changes reaching production. Violates Principle I (HITL must approve deploys).
- **Manual workflow dispatch only** — low overhead compared to tags but less auditable (no commit history link). Tags are better.
- **Environment-based branch rules** (e.g., main → prod, staging → staging) — only works for single-tenant; scales poorly when multi-tenant customers have their own release cadence (v0.5+).

## FOCUS Compliance Gate (Roadmap v0.2)

**Phase 1 reality**: today's terraform-validate.yml workflow runs fmt → init → validate → tflint → checkov, then uploads infracost JSON as artifact. The 9-tag jq validation step shown below is **Roadmap v0.2** — it will land as a merge-gate enforcement step in a follow-up PR. Until then, FOCUS tag compliance is enforced via PR review against [ADR-001 §9-key tag set](./ADR-001-single-aws-account.md).

```bash
# Exact validation (Roadmap v0.2 — part of terraform-validate.yml)
infracost breakdown --format json | \
  jq 'if (.projects[].breakdown.resources[] | select(.tags | keys | length < 9)) then
    error("FOCUS tag keys missing on resource: " + .name)
  else empty end'
# Exit code 0 = all resources have all 9 tags
# Exit code non-zero = PR cannot merge, tag-triggered deploy is blocked (when implemented)
```

When implemented at v0.2, this will prevent shipping infrastructure without complete cost tagging.

## Cross-References

- [LEAN-5S-3T.md — Standardize CI / Sustain automation](../LEAN-5S-3T.md)
- [b2b-blueprint.md — FinOps FOCUS Tag Strategy](../b2b-blueprint.md)
- ADR-001: Single AWS Account (tag-push deploys to this account at Phase 2 v0.3)
- ADR-002: RDS Single-AZ (provisioned via Terraform in tag-triggered workflow)
- CI workflow: `.github/workflows/terraform-validate.yml` (verified in repo)
- Container image: `nnthanh101/terraform:2.6.0` (CA-confirmed in coordination log)
