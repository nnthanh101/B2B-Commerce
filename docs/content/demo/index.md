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

## 6-Market Currency Proof

B2B-Commerce renders localized pricing in 6 major markets. Click each screenshot to verify live currency symbols and regional pricing:

| Market | Currency | Screenshot |
|--------|----------|------------|
| New Zealand | NZD | ![New Zealand market: NZ$ symbol and regional pricing proof](pathname:///img/demo/markets/nz-currency-2026-06-07.png) |
| Australia | AUD | ![Australia market: A$ symbol and regional pricing proof](pathname:///img/demo/markets/au-currency-2026-06-07.png) |
| Singapore | SGD | ![Singapore market: S$ symbol and regional pricing proof](pathname:///img/demo/markets/sg-currency-2026-06-07.png) |
| Vietnam | VND | ![Vietnam market: ₫ symbol, zero-decimal VND pricing proof](pathname:///img/demo/markets/vn-currency-2026-06-07.png) |
| United States | USD | ![United States market: $ symbol and regional pricing proof](pathname:///img/demo/markets/us-currency-2026-06-07.png) |
| United Kingdom | GBP | ![United Kingdom market: £ symbol and regional pricing proof](pathname:///img/demo/markets/gb-currency-2026-06-07.png) |

**Investor value**: Zero-configuration multi-currency cart reconciliation. Each market uses its own FX-generated pricing from a single Medusa v2 pricelist.

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
