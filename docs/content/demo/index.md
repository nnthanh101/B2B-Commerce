---
title: Demo
description: B2B-Commerce demo flows, persona playbooks, and recording storyboard.
sidebar_position: 1
tags: [demo, flows, personas, storyboard]
source_refs:
  - path: "docs/demo/"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Demo — B2B-Commerce

This section contains the demo artifacts for B2B-Commerce: narrated flows, persona playbooks, and the recording storyboard.

## Contents

| Page | Purpose |
|------|---------|
| [Storyboard](./storyboard.md) | 3-Act demo scene breakdown (Buy → Run → Adopt) |
| [Persona Flow Map](./persona-flow-map.md) | Machine-readable persona-to-flow ownership |
| [Personas: Buyer](./personas/buyer.md) | Buyer-employee persona playbook |
| [Personas: Admin](./personas/admin.md) | Admin / sales-manager persona playbook |
| [Personas: Sales Manager](./personas/sales-manager.md) | Sales manager persona |
| [Demo Flows](./flows/index.md) | Individual flow playbooks (11 flows) |

## Persona Reels

Six persona-lens reels, each embedding a validated screen recording plus on-screen screenshots and a **Why / Business value / What-if-missing** block written from that role's perspective. Every figure on screen is truthful to the live render.

| Reel | Persona lens | What it demonstrates |
|------|--------------|----------------------|
| [CFO — Governed Spend](./reel-cfo-narration.md) | CFO / Finance | Spend governed before money moves: limit enforced at cart, approval on the record |
| [COO — Procurement Velocity](./reel-coo-narration.md) | COO / Operations | A quarter's restock in minutes: bulk SKU entry, quick-order paste, CSV export — still governed |
| [Buyer — Governed Self-Service](./reel-buyer-narration.md) | Buyer-employee | Consumer-grade buying with company policy applied automatically at checkout |
| [Sales Manager — Quote Negotiation](./reel-salesmgr-narration.md) | Sales / VP Sales | Counter-offer, message thread, and accept in-platform with a full audit trail |
| [CEO — Cart → Quote → Approval](./reel-ceo-narration.md) | CEO / Executive | End-to-end: cart to filed quote to governed approval, NZD throughout |
| [CEO — Cart → Quote → Approval (Vietnamese/VND)](./reel-ceo-narration-vi.md) | CEO / Executive (Vietnamese) | Same flow, localized to Vietnamese (Linh voice) and VND currency — proof of multi-region deployment |
| [CTO — Operate / Observability](./reel-cto-narration.md) | CTO / Platform | Four golden signals on one Grafana board; Prometheus targets 4/4 UP |
| [SRE — Operate / Observability](./reel-sre-narration.md) | SRE / Platform Engineering | Live observability stack — Grafana dashboard, Prometheus targets (4/4 UP), PromQL queries, Keycloak health |
| [Admin — Invite Employee](./reel-invite-narration.md) | Admin / Governance | Token-based employee onboarding with spending limits set at invite time — governed from day one |

## Quick Start

```bash
# Prerequisites: Docker up + seed loaded
task up
task seed

# Then follow: Process & QA > Golden Path for the 15-minute walkthrough
```

## Cross-References

- [Golden Path](../process-qa/golden-path.md) — The canonical 15-minute demo
- [B2B Blueprint](../b2b-blueprint.md) — Persona journeys in product context
