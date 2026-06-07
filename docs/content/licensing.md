---
title: Licensing
description: MIT license scope, upstream attribution, and future commercial path for B2B-Commerce.
sidebar_position: 3
tags: [licensing, mit, commercial, oceansoft]
source_refs:
  - path: "docs/licensing.md"
    last_compiled: "2026-06-07"
  - path: "LICENSE"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

# Licensing

B2B-Commerce is **fully MIT-licensed** under OceanSoft copyright. All code in this repository is freely available under the same terms.

## Current License

| Scope | License | Conditions |
|-------|---------|-----------|
| **All code** (backend, storefront, infrastructure) | MIT | Free to use, modify, fork, distribute; include license text in distributions |

**License file**: See `LICENSE` in the repository root.

**What you can do**:
- Use the code freely — personal projects, commercial, internal tools, etc.
- Modify and distribute it
- Sublicense it (with MIT terms)

**What you must do**:
- Include the MIT license text when distributing
- Include the copyright notice: "Copyright 2026 Thanh Nguyen / OceanSoft.io"

## Upstream Attribution

This repository was scaffolded from **medusajs/dtc-starter** and **medusajs/b2b-starter** (both MIT, 2024 Medusa Holdings, Inc.), used as a one-time init draft per the `borrow-as-init-draft-then-own` policy. All derived code is now maintained exclusively as OceanSoft IP.

See `THIRD-PARTY-NOTICES.md` for the full attribution.

## Dependency Licenses

npm/pnpm dependencies retain their original licenses (MIT, Apache 2.0, and others). Run `pnpm licenses` for a full audit.

## Monetization Model (Phase 1)

OceanSoft monetizes this MIT codebase via:
- **Hosted SaaS**: oceansoft.io platform
- **Professional services**: deployment, customization, support
- **No commercial code boundary**: all features ship under MIT

## Future Commercial Path (v0.3+)

If OceanSoft gains paying customers needing proprietary features (e.g., multi-tenant operator tier, license-key validation), those features MAY be extracted into a separate private repository under OceanSoft Commercial License v1.0 (to be drafted if demand materializes). This decision is deferred pending real commercial demand — not speculative.

**Today**: everything is MIT. No commercial code exists in this repository.

## Questions?

- **MIT usage**: Standard MIT License applies; see `LICENSE`
- **Legal review**: Consult with OceanSoft Legal for licensing questions
- **Commercial licensing** (future): Contact sales@oceansoft.io when/if we offer licensed features
