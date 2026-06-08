---
title: "CTO Reel Narration — Operate / Observability"
description: Outcome-driven narration script for the CTO reel (Olivia, 3 beats, hook-first). Hero dashboard cold-open at t<=3s; intro over hero not black; no 4xUP grid.
sidebar_position: 11
tags: [demo, narration, cto-reel, observability, grafana, prometheus]
source_refs:
  - path: "infra/observability/grafana/dashboards/commerce.json"
    last_compiled: "2026-06-08"
  - path: "infra/observability/prometheus/prometheus.yml"
    last_compiled: "2026-06-08"
  - path: "docs/content/demo/personas/operator.md"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
reel: cto
beats: 3
beat_order: hero-first
frames:
  beat1: docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png
  beat2: docs/static/img/demo/flows/observability/prometheus-targets-up.png
  beat3: docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png
promql_verified:
  rate: "sum(rate(medusa_http_requests_total[5m])) >= 0.5 req/s (guard)"
  p95: "histogram_quantile(0.95,...) — real value from live traffic"
  targets_up: "up{} = 4/4"
role_bar: "Olivia · CTO / Platform"
removed:
  - beat: "old-beat5"
    reason: "panelId=8 grafana-upstatus-grid (4xUP junior tiles) — HITL rejected; dropped CTO-AC-2"
  - beat: "old-beat1-black"
    reason: "black placeholder intro collapsed into hero frame (CTO-AC-4: <=8s over hero)"
  - beat: "old-beat2-black"
    reason: "traffic-context narration merged into beat3 (deep panel narration)"
---

# CTO Reel — Operate / Observability: Instrumented from Minute One

**Reel arc (hook-first)**: Hero dashboard cold-open → Prometheus targets 4/4 UP → Dashboard deep-dive + closing proof

**Persona protagonist**: Olivia (CTO / platform owner, OceanSoft NZ) — owns "healthy in prod?"
**Audience**: Engineer / technical executive — must trust production instrumentation
**Traffic-first principle**: `generate-traffic.mjs` run BEFORE capture; rate >= 0.5 req/s guard enforced
**Hero-first principle**: Rich Grafana dashboard at t<=3s (CTO-AC-1); no black placeholder intro (CTO-AC-4)
**No 4xUP grid**: panelId=8 removed entirely from reel (CTO-AC-2)

---

## Beat 1 — Hero: The Production-Readiness Answer (cold-open)

**Frame**: `docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: "Digital Commerce — Backend" Grafana dashboard kiosk=tv — panels 1+2: Backend Request Latency p50/p95/p99 and Backend Request Rate by Status (2xx populated). Olivia role-bar top.
**Timing**: First visible frame at t<=3s; intro hook narration plays OVER this frame

**Narration**:
> Olivia is the CTO at OceanSoft. She trusts a live dashboard — latency percentiles, error rate, real traffic. This is what production-ready looks like.

---

## Beat 2 — Prometheus Targets: All 4 UP

**Frame**: `docs/static/img/demo/flows/observability/prometheus-targets-up.png`
**On screen**: Prometheus Target Health page — b2b-commerce (ec_backend:9000/admin/metrics), node, postgres, redis — all UP (green). Olivia role-bar top.

**Narration**:
> Prometheus is scraping four targets — the Medusa backend, Node exporter, Postgres exporter, and Redis exporter. Every component reports in. This is instrumented from minute one — not bolted on after the first incident.

---

## Beat 3 — Grafana Deep-Dive + Closing Proof

**Frame**: `docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: Same hero dashboard — latency p50/p95/p99 (real values) and Request Rate by Status (2xx line > 0). Olivia role-bar top.

**Narration**:
> The Grafana commerce dashboard reacts to the traffic. Latency percentiles — p50, p95, and p99 — show real request timing. The request-rate panel breaks out 2xx success from 4xx client errors. The slow tail is visible; averages do not hide it. Mean-time-to-detect begins here. The answer to "can we run this in production?" is yes — and here is the proof.

---

## Narration Notes

- **Hero-first**: Beat 1 = Grafana dashboard at t<=3s (not black); intro hook is <=8s layered over the hero.
- **Real values on screen**: p50/p95/p99 from live traffic (exact ms values depend on current load; not hard-coded in narration).
- **4/4 targets**: b2b-commerce, node, postgres, redis — all UP. Verified via PromQL `up{}` before capture; rate >= 0.5 guard enforced.
- **No Up-Status grid**: panelId=8 / grafana-upstatus-grid.png removed. The rich dashboard is the health proof.
- **No login wall**: Grafana anonymous Viewer enabled (GF_AUTH_ANONYMOUS_ENABLED=true). kiosk=tv URL for clean framing.
- **Olivia role-bar**: `injectRoleBar("Olivia · CTO / Platform", "O")` on every CTO frame before screenshot.
