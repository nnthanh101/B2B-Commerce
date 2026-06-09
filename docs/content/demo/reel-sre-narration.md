---
title: "SRE Reel Narration — Operate / Observability"
description: Narration script for the SRE reel (Oliver, 4 beats). Full-bleed static frames — Grafana dashboard, Prometheus targets, live PromQL query, Keycloak IdP health. Capability framing only, no fabricated SLA numbers.
sidebar_position: 12
tags: [demo, narration, sre-reel, observability, grafana, prometheus, keycloak]
source_refs:
  - path: "infra/observability/grafana/dashboards/commerce.json"
    last_compiled: "2026-06-09"
  - path: "infra/observability/prometheus/prometheus.yml"
    last_compiled: "2026-06-09"
  - path: "infra/keycloak/realm-export.json"
    last_compiled: "2026-06-09"
last_compiled: "2026-06-09T00:00:00Z"
reel: sre
beats: 4
beat_order: hero-first
frames:
  beat1: docs/static/img/demo/flows/sre-operate-observability/grafana-dashboard-hero.png
  beat2: docs/static/img/demo/flows/sre-operate-observability/prometheus-targets-up.png
  beat3: docs/static/img/demo/flows/sre-operate-observability/prometheus-p95-query.png
  beat4: docs/static/img/demo/flows/sre-operate-observability/keycloak-idp-health.png
promql_verified:
  rate: "sum(rate(medusa_http_requests_total[5m])) = 0.6079 req/s at capture"
  p50: "histogram_quantile(0.50,...) = 9ms at capture"
  p95: "histogram_quantile(0.95,...) = 74ms at capture"
  targets_up: "up{} = 4/4 (b2b-commerce, node, postgres, redis)"
keycloak_verified:
  oidc_discovery: "HTTP 200 at /realms/medusa-commerce/.well-known/openid-configuration"
  issuer: "http://keycloak:8080/realms/medusa-commerce"
role_bar: "Oliver · SRE / Platform Engineering"
assembly:
  vf_mode: fill_crop
  transitions: xfade 0.5s fade
  resolution: 1280x720
  source_resolution: "2560x1440 (deviceScaleFactor:2)"
  tts_voice: Daniel (en_GB)
  duration_s: 60.2
honesty_rule: "All dashboard values are live demo telemetry — not product KPI or SLA claims. Narration uses capability framing only."
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# SRE Reel — Operate / Observability: Keep It Healthy

**Reel arc (hero-first)**: Grafana full dashboard → Prometheus 4/4 UP → Live p95 query → Keycloak IdP health

**Persona protagonist**: Oliver (SRE / Platform Engineering) — owns "is it healthy right now?"
**Audience**: SRE practitioners, platform engineers, technical operations teams
**Traffic-first principle**: `generate-traffic.mjs` run before capture; rate = 0.6079 req/s at capture time
**Static frames only**: No Ken-Burns / no zoom-pan per HITL directive (full-bleed static framing)
**HONESTY RULE**: All metric values shown are live demo telemetry — not product SLA claims or KPIs

<video controls preload="metadata" style={{maxWidth:'800px'}} src={useBaseUrl('/video/demo/flows/sre-operate-observability.mp4')}></video>

<img src={useBaseUrl('/img/demo/flows/sre-operate-observability/grafana-dashboard-hero.png')} alt="Grafana Digital Commerce Backend dashboard — p50/p95/p99 latency, request rate by status, Postgres connections, database size" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/sre-operate-observability/prometheus-targets-up.png')} alt="Prometheus Target Health — b2b-commerce, node, postgres, redis all UP (4/4)" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/sre-operate-observability/prometheus-p95-query.png')} alt="Prometheus expression browser — live p95 latency PromQL query: histogram_quantile(0.95,...)" style={{maxWidth:'800px'}} />

<img src={useBaseUrl('/img/demo/flows/sre-operate-observability/keycloak-idp-health.png')} alt="Keycloak IdP Health — medusa-commerce realm live, OIDC discovery returns 200" style={{maxWidth:'800px'}} />

## Why this matters — SRE lens

**Why**: An SRE must be able to answer "is the platform healthy right now?" in under 15 seconds — without opening a support ticket or waiting for an alert. This reel opens with the full operating picture: every golden signal on one board, every target reporting in, the identity provider reachable.

**Business value**: The reel shows four independent evidence layers — Grafana dashboard metrics, Prometheus scrape health, live PromQL query capability, and Keycloak IdP reachability — that together give an SRE complete confidence the platform is operating normally.

**What-if-missing**: Without this observability surface, the first signal of a degradation is a customer complaint. With it, the signal is a metric crossing a threshold — detectable in one scrape interval.

---

## Beat 1 — Hero: The Operating Picture (cold-open)

**Frame**: `docs/static/img/demo/flows/sre-operate-observability/grafana-dashboard-hero.png`
**On screen**: "Digital Commerce — Backend" Grafana dashboard in kiosk=tv mode. All panels visible: Backend Request Latency p50/p95/p99 time-series (p50=24ms, p95=89.8ms, p99=141ms), Backend Request Rate by Status (2xx, 4xx), Postgres Active Connections, Postgres Database Size. Oliver role-bar top.

**Narration**:
> Four golden signals — one board. This is the operating picture for B2B-Commerce right now. Latency, traffic, errors, and saturation, all measured from live traffic. When something degrades, it shows up here.

---

## Beat 2 — Prometheus Targets: 4/4 UP (the Heartbeat)

**Frame**: `docs/static/img/demo/flows/sre-operate-observability/prometheus-targets-up.png`
**On screen**: Prometheus Target Health page — b2b-commerce (1/1 up), node (1/1 up), postgres (1/1 up), redis (1/1 up). Last scrape timestamps and durations visible. UP badges highlighted green. Oliver role-bar top.

**Narration**:
> Four targets — b2b-commerce, Postgres, Redis, and node — all UP, all scraped every fifteen seconds. That scrape interval is the platform's heartbeat. If a target goes down, Prometheus knows within one scrape window.

---

## Beat 3 — Live PromQL Query: p95 Latency

**Frame**: `docs/static/img/demo/flows/sre-operate-observability/prometheus-p95-query.png`
**On screen**: Prometheus expression browser — Graph tab — showing `histogram_quantile(0.95,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))` query with a real time-series graph over 1h. Y-axis values in seconds (0.06–0.22 range visible). Oliver role-bar top.

**Narration**:
> This is p95 request latency — queried live from Prometheus right now. The expression browser lets an SRE interrogate any metric in real time. No dashboards needed: the data layer is directly queryable.

---

## Beat 4 — Keycloak IdP Health: Identity Provider is Live

**Frame**: `docs/static/img/demo/flows/sre-operate-observability/keycloak-idp-health.png`
**On screen**: Styled Keycloak realm info overlay — "Identity Provider: Healthy" — showing realm `medusa-commerce`, public key (truncated), token-service URL, account-service URL. OIDC discovery endpoint reference at bottom. Oliver role-bar top.

**Narration**:
> The identity provider is healthy. Keycloak's medusa-commerce realm is live — the OIDC discovery endpoint returns two hundred, token and account services are reachable. Authentication is the first dependency that breaks a login flow; we can see it's operating normally.

---

## Narration Notes

- **Static frames**: No Ken-Burns / no zoom-pan per HITL directive. Dense dashboards and Prometheus graphs require static framing to stay legible at 1280x720.
- **Full-bleed 16:9**: Source PNGs are 2560x1440 (deviceScaleFactor:2), downscaled by ffmpeg to 1280x720 with zero letterbox bars (`fill_crop` mode).
- **Traffic-first gate**: `generate-traffic.mjs` run before capture; rate = 0.6079 req/s at time of capture.
- **Live metric values**: p50=9ms, p95=74ms at Prometheus API query time (values vary with traffic; Grafana dashboard shows p50=24ms, p95=89.8ms over the 1h window). These are demo telemetry, not KPIs.
- **MTTD framing**: Beat 2 says "Prometheus knows within one scrape window" — referencing the 15s `global.scrape_interval` from `prometheus.yml`. No MTTR claimed (no incident data exists).
- **Keycloak beat**: Captures realm endpoint JSON styled as an "IdP health" card — avoids requiring Keycloak admin credentials while still showing a real, populated response.
- **No login wall**: Grafana anonymous Viewer enabled (`GF_AUTH_ANONYMOUS_ENABLED=true`). kiosk=tv URL for clean framing.
- **Oliver vs Olivia**: SRE reel uses "Oliver · SRE / Platform Engineering" (green dot) to distinguish from CTO reel "Olivia · CTO / Platform" (blue dot). Same role-bar CSS, different persona.
- **No fabricated SLA numbers**: Narration uses capability framing throughout ("we can see", "Prometheus knows", "it shows up here") — never claims an uptime percentage or SLA target.
- **Keycloak issuer**: OIDC discovery returns issuer `http://keycloak:8080/realms/medusa-commerce` (internal Docker hostname; correct for local demo environment).
- **xfade transitions**: 0.5s fade crossfades between each beat for polish; same assembly pattern as CTO reel.
