# ADR-016: Runtime Observability Configs Consolidated Under `infra/`

**Status**: Accepted
**Date**: 2026-06-07
**Deciders**: infrastructure-engineer, cloud-architect, HITL
**Relates to**: [ADR-007](./ADR-007-grafana-prometheus-local-first.md), [ADR-015](./ADR-015-local-first-terraform-iac.md)

---

## Context

After ADR-007 (2026-06-05 amendment) introduced the opt-in `docker-compose.observability.yml`
overlay with five containers (Prometheus, Grafana, three exporters), the Grafana and Prometheus
runtime configuration files were placed at the repository root as `observability/grafana/` and
`observability/prometheus/`. This location was convenient as a first-pass but created a split
mental model:

- Runtime observability configs (`observability/`) lived at root alongside `apps/`, `docs/`, `tests/`
- Infrastructure-as-Code for cloud observability (`infra/terraform/aws/modules/observability/`)
  lived under `infra/`
- The `infra/` directory already owned all deployment-target assets: Terraform modules,
  bootstrap state, LocalStack tiers, and the `infra/terraform/aws/` submodule

The split required engineers to context-switch between two directories when reasoning about the
full observability lifecycle (local runtime → Terraform cloud promotion). It also gave the wrong
impression that `observability/` was a peer concern to `apps/` (product code), when it is
infrastructure configuration.

A Terraform `infra/terraform/aws/modules/observability/` stub already exists as the AMP/AMG
destination provisioner (v0.3 roadmap). Keeping runtime configs under `infra/` makes the
progression from local compose configs to managed cloud observability a single-tree journey.

---

## Decision

Move the runtime observability configuration directory from the repository root into `infra/`:

```
observability/           →   infra/observability/
  grafana/               →     grafana/
    dashboards/          →       dashboards/
    provisioning/        →       provisioning/
  prometheus/            →     prometheus/
    prometheus.yml       →       prometheus.yml
```

Update all filesystem references to the moved path:

- `docker-compose.observability.yml` — four volume mount lines: `./observability/...` → `./infra/observability/...`
- `CLAUDE.md` — 4-layer table: Infrastructure row now reads `infra/` (incl. `observability/`), + `terraform-aws/` submodule
- `docs/architecture/ADR-007-grafana-prometheus-local-first.md` — amendment point 5 historical path reference updated

The Terraform module at `infra/terraform/aws/modules/observability/` is unchanged; it is the
cloud destination stub, not the runtime config tree.

---

## Consequences

### Accepted

- **One infra tree**: engineers find both runtime compose configs and IaC in `infra/`; the
  progression path local → cloud is visible in a single directory subtree.
- **Cleaner root**: repository root now contains only the product directories (`apps/`, `docs/`,
  `tests/`) and top-level config files — not infrastructure subdirectories.
- **Promotion alignment**: when `infra/terraform/aws/modules/observability/` is promoted at v0.3
  (AMP/AMG), the local runtime configs it mirrors sit one directory level above it in the same
  tree, making the relationship explicit.
- **E2E tests unaffected**: the `tests/e2e/` Playwright specs hit Grafana over HTTP
  (`http://localhost:3000`) — no filesystem path reference to `observability/` exists in the
  test suite.

### Trade-offs

- **`docker-compose.observability.yml` volume paths** must reference `./infra/observability/...`
  instead of `./observability/...`. Engineers who have the old path cached in shell history will
  get a volume mount error; the compose file is the single source of truth and the error is
  immediate and obvious.
- **Git rename tracking**: a plain `mv` followed by `git add -A` records this as a rename (not
  a delete+add), preserving blame history across the directory. HITL must run `git add -A`
  (or `git add infra/observability observability`) to stage the rename correctly.

### Rejected

- **Leave at root** — perpetuates the split mental model; no upside.
- **Move under `infra/terraform/aws/`** — the runtime compose configs are not Terraform HCL;
  mixing runtime configs into the Terraform tree would confuse `terraform init` and violate the
  Terraform style convention (non-HCL files in module directories).

---

## Blast Radius

| File | Change type | Impact |
|------|-------------|--------|
| `observability/` (root) | Renamed → `infra/observability/` | git rename; no content change |
| `docker-compose.observability.yml` | 4 volume path lines updated | Compose restart required |
| `CLAUDE.md` | 1-line prose edit in 4-layer table | Documentation only |
| `docs/architecture/ADR-007-grafana-prometheus-local-first.md` | 1-line historical path ref updated | Documentation only |
| `infra/terraform/aws/README.md` | No change needed | Module path was already correct |
| `tests/e2e/` | No change | Grafana accessed over HTTP only |

---

## HITL Action Required

The `docker-compose.observability.yml` volume paths were blocked from agent edit by the
`enforce-docker-registry.sh` hook (fires on any Edit/Write to `docker-compose*.yml`, flagging
the pre-existing ADR-007 §8 exempted images as violations regardless of which lines are being
changed). HITL must apply the volume path changes directly:

```bash
# Verify the 4 lines that need updating (should show ./infra/observability/... after HITL edits):
grep -n "infra/observability" docker-compose.observability.yml

# If not yet updated, apply manually (4 sed replacements) or set bypass and re-run agent:
# Option A — set bypass in .claude/settings.local.json env: { "ADLC_REGISTRY_BYPASS": "true" }
#   then re-invoke the infrastructure-engineer agent for step 3 only.
# Option B — manual sed (run from repo root):
#   sed -i '' 's|./observability/|./infra/observability/|g' docker-compose.observability.yml

# Verify compose resolves:
docker compose -f docker-compose.observability.yml config --quiet && echo "PASS"

# Stage the rename (git detects rename automatically with -A):
git add -A infra/observability docker-compose.observability.yml CLAUDE.md \
    docs/architecture/ADR-007-grafana-prometheus-local-first.md \
    docs/architecture/ADR-016-observability-under-infra.md
```

---

## References

- [ADR-007: Grafana + Prometheus Observability Stack (Local-First)](./ADR-007-grafana-prometheus-local-first.md) — original decision; runtime configs first placed at root
- [ADR-015: Local-First Terraform IaC](./ADR-015-local-first-terraform-iac.md) — `infra/terraform/aws/modules/observability/` stub context
- `infra/terraform/aws/README.md` — directory layout and v0.3 observability module roadmap
- `docker-compose.observability.yml` — opt-in observability overlay (5 containers)
