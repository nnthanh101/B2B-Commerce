---
title: "ADR-017: Demo Video Pipeline Hardening"
description: Correct-by-construction demo-video pipeline — assert settled DOM before capture, gate per-flow manifest integrity before assembly.
sidebar_position: 17
tags: [adr, demo, video, pipeline, capture, ci]
source_refs:
  - path: "scripts/capture-flows.mjs"
    last_compiled: "2026-06-08"
  - path: "scripts/batch-demo-video.sh"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-08T00:00:00Z"
---

# ADR-017: Demo Video Pipeline Hardening

**Status**: Accepted
**Date**: 2026-06-08
**Deciders**: product-owner, cloud-architect, HITL
**Relates to**: [ADR-009](./ADR-009-apps-as-first-party-not-upstream.md), [ADR-010](./ADR-010-medusa-ootb-extended.md)

## Summary

The B2B-Commerce demo video pipeline uses screenshot-slideshow composition (Option A) rather than realtime screen recording (Option B). This ADR documents the decision, the hardening mechanisms implemented in Phase 1, and the Phase 2 deferral.

**Phase 1 Shipped**:
- DOM settlement guard in `capture-flows.mjs` — prevents early captures before UI renders
- Per-flow manifest integrity gate in `batch-demo-video.sh` — validates screenshot count matches narration scenes before video assembly

**Phase 2 Deferred**:
- Narration text overlay via HTML→PNG headless Playwright (ffmpeg drawtext unavailable in container)

## Context

The B2B-Commerce demo pipeline must generate a series of short videos, each 15–90 seconds, showcasing specific business workflows (cart-to-quote, approval, company management, etc.). The pipeline consists of two stages:

1. **Capture stage** (`capture-flows.mjs`): Playwright drives a user journey through the storefront, capturing PNG screenshots at key interaction points
2. **Assembly stage** (`batch-demo-video.sh`): TTS (text-to-speech) generates audio narration; ffmpeg concatenates PNG images with audio via the concat demuxer + `-shortest` flag, so each screenshot displays for exactly the duration of its corresponding audio segment

Two technical approaches were evaluated:

- **Option A (screenshot slideshow)**: Compose PNG images with audio timing driven by TTS duration + ffmpeg concat-filter
- **Option B (realtime capture)**: Use Playwright `recordVideo` or macOS `screencapture`/`ffmpeg -f avfoundation` to capture the live screen recording

## Decision

**Option A (screenshot slideshow) ACCEPTED**

TTS audio becomes the time axis. Each PNG loops for exactly the duration of its corresponding audio segment via ffmpeg `-shortest` flag. The concat-filter resets the timebase after each image→audio pair, preventing cumulative A/V drift over multi-scene videos. This approach is:

- **Deterministic**: Same input (PNG set, narration text) always produces the same MP4 (reproducible in CI)
- **Slide-lock**: Each screenshot is guaranteed to display for its audio duration; no sync issues
- **Container-safe**: ffmpeg + TTS work in any Alpine container; no GUI/screencapture dependencies

**Hardening (Phase 1)**:

1. **DOM Settlement Guard** (`capture-flows.mjs` L45–67): Playwright waits for all network activity to settle and DOM to stabilize before capturing. Pattern:
   ```javascript
   await page.waitForLoadState('networkidle')
   await page.waitForTimeout(500) // additional visual settle time
   ```
   Prevents capturing partially-rendered UI, blank prices, or stuck spinners.

2. **Manifest Integrity Gate** (`batch-demo-video.sh` L82–94): Before assembling video, compare screenshot count in the flow directory to scene count in the narration manifest. Exit 2 if mismatch — blocks assembly of incomplete or extra stills.

## Option B Rejected

**Realtime capture approach NOT accepted.**

- **Playwright `recordVideo`**: Produces silent WebM; audio must still be muxed separately — no simplification of the assembly stage
- **macOS `screencapture`**: Non-deterministic frame timing; subject to OS resource contention; not reproducible in CI
- **ffmpeg `-f avfoundation`**: Requires macOS-specific flags; no Alpine Linux equivalent; blocks CI containerization
- **Net effect**: Complexity increases (capture code + audio-mux code both required), sync guarantees decrease (realtime timing is inherently less predictable than scheduled TTS duration)

## Consequences

**Phase 1 Shipped**:
- DOM settlement guard operational; captured stills are correct-state (non-empty prices, no loading spinners)
- Manifest gate operational; mismatch between stills and narration scenes caught before video assembly
- E2E test coverage: `tests/e2e/generated/demo-*.spec.ts` (Playwright test specs for each flow)

**Phase 2 Deferred**:
- Narration text overlay (e.g., "Step 1: Add product to cart") requires HTML→PNG rendering via headless Chromium
- ffmpeg `drawtext` filter unavailable in Alpine container (freetype library missing)
- Workaround: Render overlay HTML via Playwright in a headless container, convert to PNG per-scene, then composite with concat-filter
- **Timeline**: Deferred beyond Phase 1; low priority (video is self-explanatory via UI screenshots + TTS narration)

**Path Restructuring Decisions** (both KEEP):

- **KEEP `/demo/` in static path references**: 17 existing `pathname:///img/demo/` references in markdown + 11 video embeds point to `/demo/` subdirectories. Migration cost (find-replace + test) exceeds value. No architectural reason to move.
- **KEEP separate `docs/static/img/` and `docs/static/video/` dirs**: Screenshots go to `img/demo/`; MP4s go to `video/demo/`. Aligns with Docusaurus static-asset conventions. Combined per-flow dirs would create unconventional structure with no deployment or UX benefit.

## Trade-offs

**Accepted**: TTS-driven timing discipline. Every demo uses standardized narrator (macOS `say` voice Daniel, en_GB) and fixed narration-to-screenshot mapping.

**Rejected**: Custom voice cloning (e.g., AWS Polly, Google Cloud TTS) would allow different narrators per workflow. Deferred — standardized narrator suffices for Phase 1 demo use case.

**Trade-off**: DOM settlement guard adds ~2–3 seconds per capture (network settle + visual timeout). Acceptable for demo pipeline (not real-time); capture runs autonomously in `task seed:demo` + Playwright batch mode.

## Cross-References

- [ADR-009](./ADR-009-apps-as-first-party-not-upstream.md) — Apps as first-party; demo use cases inform UX
- [ADR-010](./ADR-010-medusa-ootb-extended.md) — Medusa storefront extensibility via custom modules; demo flows exercise these extensions
- `scripts/capture-flows.mjs` — Playwright capture driver with DOM settlement guard
- `scripts/batch-demo-video.sh` — ffmpeg assembly with manifest integrity gate
- `tests/e2e/generated/demo-*.spec.ts` — Playwright test suite for demo flows
