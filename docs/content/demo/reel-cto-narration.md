---
title: "CTO Reel Narration — Operate / Observability"
description: Outcome-driven narration script for the CTO reel (Olivia, 5 beats). Traffic-first, evidence-bound to real populated Grafana panels.
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
frames:
  beat1: null
  beat2: null
  beat3: docs/site/img/demo/flows/observability/prometheus-targets-up.png
  beat4: docs/site/img/demo/flows/observability/grafana-latency-rate-panels.png
  beat5: docs/site/img/demo/flows/observability/grafana-upstatus-grid.png
promql_verified:
  rate: "sum(rate(medusa_http_requests_total[5m])) = 2.49 req/s"
  p95: "histogram_quantile(0.95,...) = 248ms"
  targets_up: "up{} = 4/4"
---

# CTO Reel — Operate / Observability: Instrumented from Minute One

**Reel arc**: Production-readiness question → Generate real traffic → Prometheus targets UP → Grafana panels populated → Up-Status grid all green

**Persona protagonist**: Olivia (CTO / platform owner, OceanSoft NZ) — owns "healthy in prod?"
**Audience**: Engineer / technical executive — must trust production instrumentation
**Traffic-first principle**: Real cart-to-quote-to-approval traffic generated BEFORE dashboard capture (anti-empty-dashboard)

---

## Beat 1 — Setup: The Production-Readiness Question

**Frame**: N/A — context card / narration only
**On screen**: Stack-up context, all services running

**Narration**:
> Olivia is the CTO at OceanSoft. When someone asks "can we run this in production?", she does not answer by pointing at a green checkout button. She trusts a live dashboard fed by real traffic — latency percentiles, error rate, and an all-green scrape grid. Most demos skip this part. This one does not.

---

## Beat 2 — Generate Real Traffic (Anti-Empty-Dashboard)

**Frame**: N/A — action beat; narration only or brief terminal context
**On screen**: Real commerce requests hitting the backend (cart, products, quotes, approvals)

**Narration**:
> Before opening the dashboard, the team drives real commerce traffic through the system — the same cart-to-quote-to-approval actions that Maria and David ran. Those requests hit the Medusa backend's metrics endpoint, populating real request counts and real latencies. The dashboard will show truth, not an empty grid.

---

## Beat 3 — Prometheus Targets: All 4 UP

**Frame**: `docs/site/img/demo/flows/observability/prometheus-targets-up.png`
**On screen**: Prometheus Target Health page — b2b-commerce (ec_backend:9000/admin/metrics), node, postgres, redis — all UP (green)

**Narration**:
> Prometheus is scraping four targets — the Medusa backend, Node exporter, Postgres exporter, and Redis exporter. Every component reports in. This is instrumented from minute one — not bolted on after the first incident.

---

## Beat 4 — Grafana: Latency and Error Rate React to Traffic

**Frame**: `docs/site/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: "Digital Commerce — Backend" dashboard — Backend Request Latency p50/p95/p99 (p50=31.8ms, p95=105ms, p99=191ms) and Backend Request Rate by Status (2xx populated, ~1.99 req/s max)

**Narration**:
> The Grafana commerce dashboard reacts to the traffic just generated. Latency percentiles — p50, p95, and p99 — show real request timing. The request-rate panel breaks out 2xx success from 4xx client errors. The slow tail is visible; averages do not hide it. Mean-time-to-detect begins here.

---

## Beat 5 — Up-Status Grid: Healthy in One Glance

**Frame**: `docs/site/img/demo/flows/observability/grafana-upstatus-grid.png`
**On screen**: Up-Status Grid — All Scrape Targets: 4 green tiles — Medusa Backend (ec_backend:9000), Postgres Exporter, Redis Exporter, Node Exporter — all "UP"

**Narration**:
> One panel answers "is it healthy?" for the entire platform — four green tiles, one glance. If any target turned red, the team would know within seconds. Not from a customer call — from the dashboard. Instrumented from minute one, mean-time-to-detect is seconds. The answer to "can we run this in production?" is yes — and here is the proof.

---

## Narration Notes

- **Traffic-first ordering**: Beat 2 (traffic generation) MUST precede beat 3 (Prometheus) and beat 4 (Grafana) in the reel. Never open on an empty panel.
- **Real values on screen**: p50=31.8ms, p95=105ms mean (278ms max), p99=191ms mean (665ms max). These are from real commerce requests, not synthetic load.
- **4/4 targets**: b2b-commerce, node, postgres, redis — all UP. Verified via PromQL `up{}` returning `"1"` for all four before capture.
- **Up-Status panel**: Panel id 8, inside row id 104 (collapsed by default in commerce.json). Captured via Grafana d-solo URL to bypass collapsed-row UI issue.
- **No login wall**: Grafana anonymous Viewer is enabled (GF_AUTH_ANONYMOUS_ENABLED=true). No login required for read/screenshot.
