---
title: "Persona: Operator / CTO"
description: Operator persona playbook — owns "is it healthy in production?" via Grafana + Prometheus.
sidebar_position: 4
tags: [demo, persona, operator, cto, observability, sre]
source_refs:
  - path: "docs/demo/personas/operator.md"
    last_compiled: "2026-06-08"
  - path: "infra/observability/grafana/dashboards/commerce.json"
    last_compiled: "2026-06-08"
  - path: "infra/observability/prometheus/prometheus.yml"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
---

# Persona: Olivia (Operator / CTO)

**Role**: Platform owner / CTO — owns the answer to "is the commerce platform healthy in production, right now?"

Olivia is the CTO at OceanSoft (NZ). She is the person a board member, an on-call engineer, or a customer-success lead turns to when they ask "is it up, is it fast, can we run this in prod?" Her pain: most demos show features but never the operational truth — no SLOs, no latency percentiles, no proof the thing is instrumented. She has been burned by "it works on the happy path" software that had zero observability when it hit real load. She does NOT trust a green checkout button; she trusts a populated p99-latency panel and an all-green scrape-target grid.

**What Olivia cares about**: Instrumented-from-minute-one (metrics exist before the first customer, not bolted on after an incident), latency percentiles (p50/p95/p99, not averages), error-rate by HTTP status, and a single-pane up-status grid so she can answer "healthy?" in one glance. Mean-time-to-recovery (MTTR) starts with mean-time-to-detect — and you cannot detect what you do not measure.

**What she avoids**: An empty dashboard with no data behind the panels (the "we have monitoring" theater); averages that hide tail latency; a feature demo that cannot answer "what happens under load?"; discovering a service is down from a customer instead of from a scrape-target turning red.

**Key capability she unlocks**: A provisioned Grafana commerce dashboard (`infra/observability/grafana/dashboards/commerce.json`) reading from Prometheus (`:9090`), scraping four real targets — the Medusa backend `/admin/metrics` (job `b2b-commerce`), `postgres`, `redis`, and `node` exporters — all UP from minute one. Real panels: backend request latency p50/p95/p99, request rate by HTTP status, postgres connections + DB size, redis hit-ratio + memory, node CPU + memory, and an Up-Status grid across all scrape targets.

> **Anti-empty-dashboard caveat (BLOCKING for the reel)**: A dashboard with no traffic behind it is NATO. The operate reel MUST generate REAL commerce traffic FIRST — by running the cart → quote → approval actions (the same actions Maria/David perform in the CEO reel) — so the backend `/admin/metrics` endpoint emits real request counts and latencies, and the Grafana panels render populated lines instead of flat-zero. The reel shows traffic-generation → then the dashboard reacting to that traffic. Empty panels = reject.

## CTO-Reel Pilot Depth (operate / observability)

> **Reel role**: Olivia is the protagonist of the CTO reel. The reel's job is to make an ENGINEER trust the platform is production-instrumented — not to tour Grafana's UI. Outcome over mechanic: "we can run this in prod and we'd know in seconds if it broke." Evidence-bound to the provisioned dashboard + UP Prometheus targets. [product:write-stories]

**JTBD**: "When someone asks 'can we run this in production?', I need to point at a live dashboard fed by real traffic — latency percentiles, error rate, and an all-green scrape grid — so I can answer 'yes, and here's how we'd know the moment it degraded' with evidence, not assertion."

**Pains → Gains** (the outcome the engineer must *trust*):

| Pain (feature-tour demos) | Gain (on screen, provably-green) |
|---------------------------|----------------------------------|
| "We have monitoring" but the dashboard is empty | Panels populated by real cart→quote→approval traffic generated in-reel |
| Averages hide the slow tail | p50 / p95 / p99 latency shown explicitly (real panel) |
| No visibility into failure modes | Request rate broken out by HTTP status (real panel) |
| "Is it up?" answered by guessing | Up-Status grid: all four scrape targets green (b2b-commerce, postgres, redis, node) |
| Detection lag → long MTTR | Instrumented from minute one → mean-time-to-detect is seconds, not a customer call |

**Success metric (measured, NOT forecast)**: at reel end, the Grafana commerce dashboard shows (a) non-flat latency lines reacting to the traffic generated in-reel, (b) request-rate panel showing real requests by status, and (c) Up-Status grid = 4/4 targets UP. MTTD framing: the metric exists from minute one, so detection is dashboard-immediate. No panel is empty; no target is red.

**5W1H (Olivia)**:
- **Who**: Olivia, CTO / platform owner, OceanSoft NZ; owns "healthy in prod?"
- **What**: Generate real commerce traffic, then read the live Grafana dashboard fed by Prometheus.
- **When**: Production-readiness review — the moment before "ship it."
- **Where**: Grafana `:3000` commerce dashboard + Prometheus `:9090` targets page; backend `/admin/metrics`.
- **Why**: An engineer trusts populated SLO panels, not a green button; instrumented-from-minute-one is the production bar.
- **How**: Run cart→quote→approval to emit metrics → open the commerce dashboard → show latency p50/p95/p99, request-rate-by-status, and the 4/4 Up-Status grid.

**Flows/screens this persona drives in the pilot**: net-new "operate" reel — (1) traffic-generation via the cart→quote→approval actions, (2) Prometheus `:9090` targets page (4 jobs UP), (3) Grafana `:3000` commerce dashboard latency + request-rate + up-status panels.

## Cross-References

- [Persona: Maria (Buyer-Employee)](./buyer.md) — generates the cart→quote→approval traffic the dashboard reacts to
- [Persona: David (Admin)](./admin.md) — closes the approval loop that completes the traffic
- [Demo Storyboard](../storyboard.md) — 3-Act scene breakdown (Buy → Run → Adopt); "Run" act = this persona
