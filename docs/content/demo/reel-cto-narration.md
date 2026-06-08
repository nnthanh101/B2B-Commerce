---
title: "CTO Reel Narration — Operate / Observability"
description: Outcome-driven narration script for the CTO reel (Olivia, 3 beats, hook-first). Hero dashboard cold-open at t≤3s; intro over hero not black; no 4xUP grid.
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
    reason: "black placeholder intro collapsed into hero frame (CTO-AC-4: ≤8s over hero)"
  - beat: "old-beat2-black"
    reason: "traffic-context narration merged into beat3 (deep panel narration)"
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# CTO Reel — Operate / Observability: Instrumented from Minute One

**Reel arc (hook-first)**: Hero dashboard cold-open → Prometheus targets 4/4 UP → Dashboard deep-dive + closing proof

**Persona protagonist**: Olivia (CTO / platform owner, OceanSoft NZ) — owns "healthy in prod?"
**Audience**: Engineer / technical executive — must trust production instrumentation
**Traffic-first principle**: `generate-traffic.mjs` run BEFORE capture; rate >= 0.5 req/s guard enforced
**Hero-first principle**: Rich Grafana dashboard at t≤3s (CTO-AC-1); no black placeholder intro (CTO-AC-4)
**No 4xUP grid**: panelId=8 removed entirely from reel (CTO-AC-2)

<video controls preload="metadata" style={{maxWidth:'800px'}} src={useBaseUrl('/video/demo/flows/cto-operate-observability.mp4')}></video>

<img src={useBaseUrl('/img/demo/flows/observability/grafana-latency-rate-panels.png')} alt="Grafana hero — Backend Request Latency p50/p95/p99 and Request Rate by Status" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/observability/prometheus-targets-up.png')} alt="Prometheus Target Health — b2b-commerce, node, postgres, redis all UP (4/4)" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/observability/grafana-saturation-panels.png')} alt="Saturation panels — Postgres connections, Node CPU, Redis memory all green" style={{maxWidth:'800px'}} />

## Why this matters — CTO lens

**Why**: A CTO must be able to answer "is it healthy in production?" without a war-room. This reel opens on the answer: a Grafana board showing the four golden signals — latency, traffic, errors, saturation — reacting to real traffic.

**Business value**: The reel shows p50/p95/p99 latency and request-rate-by-status on one board, Prometheus targets 4/4 UP, and saturation panels green — instrumentation that is live, not aspirational, scraped every 15 seconds.

**What-if-missing**: Without this instrumentation, mean-time-to-detect becomes a customer phone call instead of one 15-second scrape — the reel's closing point is exactly the failure mode that absence creates.

---

## Beat 1 — Hero: The Production-Readiness Answer (cold-open)

**Frame**: `docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: "Digital Commerce — Backend" Grafana dashboard kiosk=tv — panels 1+2: Backend Request Latency p50/p95/p99 and Backend Request Rate by Status (2xx populated). Olivia role-bar top.
**Timing**: First visible frame at t≤3s; intro hook narration plays OVER this frame

**Narration**:
> Four golden signals, one board — this is how we run B2B-Commerce in production. Latency, traffic, errors, and saturation. Real data, reacting to real traffic.

**Ken-Burns effect**: Slow push-in toward the p95 line on panel1 (left-center focal point).

---

## Beat 2 — Latency is the SLI; SLO is the Target

**Frame**: `docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: Grafana panel1 — Backend Request Latency — p50/p95/p99 highlighted with glow. Legend shows the real p95 value in milliseconds. Olivia role-bar top.

**Narration**:
> p95 latency is our service-level indicator — the slow-tail percentile that users feel. The SLO is the target we commit to. Here's the real p95 from live traffic, and here's the headroom to our goal.

**Ken-Burns effect**: Emphasis zoom on p95 legend value; highlight the p95 series + legend row with outline+glow.

---

## Beat 3 — Errors and Traffic by Status

**Frame**: `docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png`
**On screen**: Grafana panel2 — Backend Request Rate by Status — 2xx (green), 4xx (orange) series visible and populated; throughput legend shows total req/s. Olivia role-bar top.

**Narration**:
> Errors aren't a single number — they're broken out by status. 2xx success, 4xx client. If a 5xx climbs, I see the failure mode broken out here, not just 'something broke'. That's RED — rate and errors — at request granularity.

**Ken-Burns effect**: Highlight 2xx (green) vs 4xx (orange) series + throughput legend; keep zoom modest to show both series context.

## Beat 4 — Saturation: The Platform Underneath is Green

**Frame**: `docs/static/img/demo/flows/observability/grafana-saturation-panels.png`
**On screen**: Pan across panels 3 (Postgres Active Connections) + 7 (Node CPU %) + 6 (Redis Memory Used). All healthy (low values, green). Olivia role-bar top.

**Narration**:
> Saturation — the fourth signal. Postgres connections, Node CPU, Redis memory. The platform underneath has headroom. Healthy by measurement, not hope.

**Ken-Burns effect**: Quick horizontal pan left→right across 3 saturation panels (hold zoom modest at 1.05); translate x to compose the three panels into a continuous scan.

---

## Beat 5 — Close: MTTD is One Scrape (15s), Not an Incident Bridge

**Frame**: `docs/static/img/demo/flows/observability/prometheus-targets-up.png`
**On screen**: Prometheus Target Health page — b2b-commerce, node, postgres, redis — all UP (green). Pull back to show full hero Grafana dashboard as well. Olivia role-bar top.

**Narration**:
> Four targets, scraped every fifteen seconds. b2b-commerce, Postgres, Redis, Node — all UP. Mean-time-to-detect is one scrape interval, not a customer phone call. Instrumented from minute one. We ship fast — and we'd know within seconds if it broke.

**Ken-Burns effect**: Slow pull-BACK (reverse push-in from Beat 1) from zoomed p95 to full hero board; bookends the opening push-in.

---

## Narration Notes

- **Hero-first**: Beat 1 = Grafana dashboard at t≤3s (not black); intro hook is ≤5s layered over the hero, named Golden Signals upfront.
- **SRE vocabulary**: Golden Signals (Latency/Traffic/Errors/Saturation) named in Beat 1; RED (Rate/Errors/Duration) named in Beat 3; SLI/SLO framed honestly in Beat 2.
- **Real values on screen**: p50/p95/p99 from live traffic (exact ms values depend on current load; not hard-coded in narration). Traffic guard >= 0.5 req/s enforced before capture.
- **5xx capability framing**: Beat 3 says "if 5xx climbs I see it broken out here" — never claims a drawn 5xx line (there is none; zero server errors today is the honest healthy state).
- **Redis panel switched**: Beat 4 now references Redis Memory-Used (panel6, always ~1.68MB) instead of Hit-Ratio (panel5, decays to 0 without active cache hits). Provides saturation signal without flat-zero panels.
- **MTTD = 15s**: Beat 5 cites the real Prometheus scrape_interval from prometheus.yml (global: 15s, all 4 jobs: 15s). No MTTR claimed (no incident data).
- **4/4 targets**: b2b-commerce, node, postgres, redis — all UP. Verified via PromQL `up{}` before capture; rate >= 0.5 guard enforced.
- **No Up-Status grid**: panelId=8 / grafana-upstatus-grid.png removed. The rich 5-panel dashboard is the health proof.
- **No login wall**: Grafana anonymous Viewer enabled (GF_AUTH_ANONYMOUS_ENABLED=true). kiosk=tv URL for clean framing.
- **Olivia role-bar**: `injectRoleBar("Olivia · CTO / Platform", "O")` on every frame before screenshot (persistent per AC-4).
