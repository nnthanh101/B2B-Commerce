---
title: Demo Storyboard
description: 3-Act demo storyboard — scene-by-scene breakdown for the 5-minute B2B-Commerce recording.
sidebar_position: 2
tags: [demo, storyboard, recording, playwright, acts]
source_refs:
  - path: "docs/demo/storyboard.md"
    last_compiled: "2026-06-07"
last_compiled: "2026-06-07T00:00:00Z"
---

import { Note } from '@site/src/components/Note';

<Note>This page is a migration stub. Run <code>/commerce:docs-ingest docs/demo/storyboard.md</code> to compile full content.</Note>

# 3-Act Demo Storyboard — B2B-Commerce

> **Purpose**: Scene-by-scene breakdown of the 5-minute product demo recorded as a GIF + narration voice-over.
> **Acts**: Buy → Run → Adopt (19 scenes)
> **Companion**: [narration.md](./narration.md) · [Golden Path](../process-qa/golden-path.md)

## Recording Architecture

- **Tier 1 (Hero)**: `claude-in-chrome` extension (DOM-aware, cursor-tracked GIF capture)
- **Tier 1 Fallback** → **Tier 2 (Guaranteed)**: Playwright headless video (`b2b-smoke.spec.ts`)
- **Act 3 (Terminal)**: `capture-terminal-gif.sh` (native screencapture)

**Source**: `docs/demo/storyboard.md` — full 19-scene breakdown available via `/commerce:docs-ingest`.

## Cross-References

- [ADR-017: Demo Video Pipeline](../architecture/adrs/ADR-017-demo-video-pipeline.md) — architectural decision for the 3-tier capture pipeline used in recording
- [Demo Narration Script](./narration.md) — timestamped voice-over for all flows
