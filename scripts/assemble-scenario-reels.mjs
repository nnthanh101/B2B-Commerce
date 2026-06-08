#!/usr/bin/env node
/**
 * Scenario-reel assembler — subtle top-anchored Ken-Burns + burned-in subtitles.
 *
 * Modeled on scripts/assemble-reels.mjs (renderSubtitleFrame CSS-injection technique,
 * buildBeatClip ffmpeg per-beat pipeline, say-TTS, concat, m4a extract) — but adds a
 * gentle zoompan move that is TOP-ANCHORED so the role header-bar baked into the top
 * ~48px of every still is NEVER cropped.
 *
 * Pipeline per beat:
 *   macOS `say` (voice Daniel) → .m4a
 *   renderSubtitleFrame (Playwright + addStyleTag CSS injection) → caption burned into 1280x720 PNG
 *   buildBeatClip (ffmpeg -loop 1 -i frame -vf scale,pad,zoompan) → per-beat mp4
 * then: concat → final MP4 → extract .m4a → ffprobe assertions.
 *
 * Build segments: tmp/B2B-Commerce/demo/video-build/<reel>/   (NOT docs/static)
 * Final outputs:  docs/static/video/demo/flows/<reel-output>.{mp4,m4a}
 *
 * Usage: node scripts/assemble-scenario-reels.mjs --reel cfo
 */

import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BUILD_ROOT = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/video-build");
const OUT_DIR = path.join(REPO_ROOT, "docs/static/video/demo/flows");

// Output frame geometry (16:9) + render fps for the Ken-Burns clip.
const W = 1280, H = 720, FPS = 30;

// ---------------------------------------------------------------------------
// KEN_BURNS flag (DEFAULT FALSE — HITL decision 2026-06-08): static frames.
//
//   false (default): each beat is a STATIC frame held for its audio duration.
//                    The letterbox (scale+pad) + burned subtitle + header-bar are
//                    kept; the zoompan move is dropped entirely. No crawl, no
//                    downscale softness — the captured pixels ship as-is.
//   true  (backlog): re-enable the subtle top-anchored Ken-Burns move below.
//
// Toggle via env: KEN_BURNS=1 node scripts/assemble-scenario-reels.mjs --reel cfo
// ---------------------------------------------------------------------------
const KEN_BURNS = process.env.KEN_BURNS === "1" || process.env.KEN_BURNS === "true";

// ---------------------------------------------------------------------------
// Ken-Burns (CRITICAL): subtle, TOP-ANCHORED, horizontally centered.
//
//   zoom: 1.0 -> ZOOM_MAX over the beat duration (linear ramp).
//   y = 0           -> the TOP edge of the frame never moves; the role header-bar
//                      baked into the top ~48px is guaranteed never cropped.
//   x = iw/2 - (iw/zoom/2)  -> horizontally centered (left/right crop is symmetric).
//
// A center/cover zoom (y='ih/2-(ih/zoom/2)') would crawl the viewport DOWN into the
// image and crop the top row — that is the documented REJECT incident. We pin y=0.
// ---------------------------------------------------------------------------
const ZOOM_MAX = 1.04;

// Build the zoompan filter for a given total-frame count `d` (frames in the beat).
// zoom ramps 1.0 -> ZOOM_MAX across exactly `d` frames; clamped so the last frame
// does not overshoot. on='1' is implicit; we drive zoom by the running frame index.
function zoompanFilter(totalFrames) {
  const inc = (ZOOM_MAX - 1.0) / Math.max(1, totalFrames - 1);
  // z increments each rendered frame; min() clamps to ZOOM_MAX on the final frame.
  const zExpr = `min(zoom+${inc.toFixed(8)}\\,${ZOOM_MAX})`;
  // TOP-ANCHORED: y is pinned to 0 (header-bar protected). x keeps horizontal center.
  return [
    `zoompan=z='${zExpr}'`,
    `x='iw/2-(iw/zoom/2)'`,
    `y='0'`,
    `d=${totalFrames}`,
    `s=${W}x${H}`,
    `fps=${FPS}`,
  ].join(":");
}

// ---------------------------------------------------------------------------
// SCENARIOS config — keyed by reel id. Each beat: { id, frame, narration }.
// CFO narration verbatim from docs/content/demo/reel-cfo-narration.md (6 beats, voice Daniel).
// ---------------------------------------------------------------------------
const CFO_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/cfo-governed-spend");
const COO_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/coo-procurement-velocity");
const BUYER_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/buyer-self-service");
const SALESMGR_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/salesmgr-quote-negotiate");
const SCENARIOS = {
  cfo: {
    voice: "Daniel",
    output: "cfo-governed-spend",
    beats: [
      {
        id: "beat1",
        frame: path.join(CFO_DIR, "step-01.png"),
        narration: "Governed spend starts before anyone shops. David, the approving manager at Demo Corp, gives each employee a hard limit — Maria's is two hundred New Zealand dollars. The control is in place before the first order is ever placed.",
      },
      {
        id: "beat2",
        frame: path.join(CFO_DIR, "step-02.png"),
        narration: "Maria, in procurement, fills her cart — two units, five hundred and twenty dollars. That is over her two-hundred-dollar limit, and the platform catches it the moment she opens the cart: this order exceeds your spending limit.",
      },
      {
        id: "beat3",
        frame: path.join(CFO_DIR, "step-03.png"),
        narration: "Checkout is blocked right here at the cart — not after the money has moved. The spend is stopped before it happens, and Maria is routed to request approval. No rogue purchase order, no awkward clawback later.",
      },
      {
        id: "beat4",
        frame: path.join(CFO_DIR, "step-04.png"),
        narration: "On the admin side, David sees approval number 2469 land in his queue — Demo Corp, one item, awaiting his decision. The request routed straight to the right approver, with no email chain.",
      },
      {
        id: "beat5",
        frame: path.join(CFO_DIR, "step-05.png"),
        narration: "He reviews and approves in a single, deliberate action — the platform confirms it cannot be undone. The decision is intentional, and it is captured.",
      },
      {
        id: "beat6",
        frame: path.join(CFO_DIR, "step-06.png"),
        narration: "Status flips to Approved. Every dollar is governed, every approval is on the record — the clean audit trail a CFO, and Finance, can actually trust.",
      },
    ],
  },
  coo: {
    voice: "Daniel",
    output: "coo-procurement-velocity",
    beats: [
      {
        id: "beat1",
        frame: path.join(COO_DIR, "step-01.png"),
        narration: "For Maria in procurement, a quarterly restock used to mean a spreadsheet and a lost afternoon. Here she adds by SKU and quantity straight from the product grid — Hi-Fi headsets at two hundred and forty-six dollars — in a single move.",
      },
      {
        id: "beat2",
        frame: path.join(COO_DIR, "step-02.png"),
        narration: "Every line resolves instantly with live New Zealand pricing — headset, keyboard, mouse. Three items, five hundred and thirty-nine dollars, with no manual lookup.",
      },
      {
        id: "beat3",
        frame: path.join(COO_DIR, "step-03.png"),
        narration: "Repeating last quarter's order is just as fast — the quick-order pad takes a pasted SKU list, one line each, and exports the whole cart to CSV. Bulk in, bulk out.",
      },
      {
        id: "beat4",
        frame: path.join(COO_DIR, "step-04.png"),
        narration: "The cart consolidates in seconds — three items, five hundred and thirty-nine dollars, priced and ready to move.",
      },
      {
        id: "beat5",
        frame: path.join(COO_DIR, "step-05.png"),
        narration: "And because it is over her limit, the platform routes it the B2B way — one click to Request Quote. An afternoon of procurement, done in under a minute, and still governed.",
      },
    ],
  },
  buyer: {
    voice: "Daniel",
    output: "buyer-self-service",
    beats: [
      {
        id: "beat1",
        frame: path.join(BUYER_DIR, "step-01.png"),
        narration: "Not every purchase is a big project. Maria browses the B2B store like any consumer site — a clean catalog, every price in New Zealand dollars, no login maze.",
      },
      {
        id: "beat2",
        frame: path.join(BUYER_DIR, "step-02.png"),
        narration: "She picks a 1080p webcam — ninety-seven dollars, clearly priced, variants in stock.",
      },
      {
        id: "beat3",
        frame: path.join(BUYER_DIR, "step-03.png"),
        narration: "One click adds it to her cart — ninety-seven dollars, one item, no friction.",
      },
      {
        id: "beat4",
        frame: path.join(BUYER_DIR, "step-04.png"),
        narration: "It is within her spending limit, so checkout is open — no block, no waiting. Self-service, the way buyers expect it.",
      },
      {
        id: "beat5",
        frame: path.join(BUYER_DIR, "step-05.png"),
        narration: "At checkout the order is placed on behalf of Demo Corp — and because company policy requires it, even a small order routes through approval. Self-service for the buyer, governance for the business — both, at the same time.",
      },
    ],
  },
  salesmgr: {
    voice: "Daniel",
    output: "salesmgr-quote-negotiate",
    beats: [
      {
        id: "beat1",
        frame: path.join(SALESMGR_DIR, "step-01.png"),
        narration: "Priya runs sales operations. A buyer at Demo Corp wants to standardise on one smartphone fleet-wide — and instead of a week of email, the whole negotiation lives in one place. Her queue flags the quote that has been countered and is awaiting the buyer.",
      },
      {
        id: "beat2",
        frame: path.join(SALESMGR_DIR, "step-02.png"),
        narration: "She opens it. The original total was one thousand, five hundred and eighty-two dollars; her counter brings it to one thousand, four hundred and twenty-three eighty — a ten percent volume discount, applied right on the line item.",
      },
      {
        id: "beat3",
        frame: path.join(SALESMGR_DIR, "step-03.png"),
        narration: "Every message is in the thread. The buyer asked for a sharper unit price on a larger recurring order; Priya replied with the discount and the revised total — no separate email, no lost context.",
      },
      {
        id: "beat4",
        frame: path.join(SALESMGR_DIR, "step-04.png"),
        narration: "The counter is on the record — the line shows modified, the old price struck through, the new price below.",
      },
      {
        id: "beat5",
        frame: path.join(SALESMGR_DIR, "step-05.png"),
        narration: "And the deal closes in-platform — Accept, or keep negotiating. Two messages, not two weeks, with a full audit trail behind every number.",
      },
    ],
  },
};

// Render subtitle overlay on a frame (PROVEN CSS-injection technique from assemble-reels.mjs).
// ffmpeg has no drawtext/libfreetype here, so captions MUST be burned via Playwright/CSS.
// The source still is composited at top/cover so its TOP row (role header-bar) is preserved.
async function renderSubtitleFrame(browser, framePath, subtitle, outPath) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const imgData = fs.readFileSync(framePath);
  const b64 = imgData.toString("base64");
  const escaped = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await page.setContent(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${W}px;height:${H}px;overflow:hidden;position:relative}
    .frame{width:${W}px;height:${H}px;background:url("data:image/png;base64,${b64}") top/cover no-repeat}
    .sub{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.75);color:#fff;font:bold 20px/1.4 system-ui,sans-serif;
      padding:10px 28px;border-radius:6px;text-align:center;max-width:1100px;white-space:pre-wrap}
  </style></head><body>
    <div class="frame"></div>
    <div class="sub">${escaped}</div>
  </body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: "png" });
  fs.writeFileSync(outPath, buf);
  await ctx.close();
  return outPath;
}

// Run macOS `say` to generate M4A audio from text.
function sayText(text, outPath, voice) {
  return new Promise((resolve, reject) => {
    const proc = spawn("say", ["-v", voice, "-o", outPath, text]);
    proc.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`say exited ${code}`));
    });
  });
}

// Get audio duration in seconds.
function getAudioDuration(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", filePath
  ]).toString();
  return parseFloat(JSON.parse(out).format.duration);
}

// Build a beat clip: subtitled PNG + audio M4A → MP4 segment with subtle top-anchored Ken-Burns.
//
// vf chain order matters:
//   1. scale=...:force_original_aspect_ratio=decrease,pad=1280:720  → letterbox non-16:9
//      sources (16:10 admin frames) WITHOUT cropping the header-bar.
//   2. zoompan (top-anchored)  → the gentle move, applied to the letterboxed 1280x720 frame.
//      Note: the subtitled PNG is already 1280x720, so step 1 is a safety net / identity here,
//      but kept per spec so the filter is correct for any non-720 source fed directly.
function buildBeatClip(beatId, framePath, audioPath, outClipPath) {
  const duration = getAudioDuration(audioPath);
  const totalDur = (duration + 0.4).toFixed(2); // 0.4s tail pad for smooth cut
  const totalFrames = Math.max(2, Math.round(parseFloat(totalDur) * FPS));

  const letterbox = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
  // KEN_BURNS OFF (default): static frame — letterbox only, no zoompan.
  // KEN_BURNS ON  (backlog): re-attach the top-anchored zoompan move.
  const vfChain = KEN_BURNS
    ? `${letterbox},${zoompanFilter(totalFrames)}`
    : letterbox;

  execFileSync("ffmpeg", [
    "-y",
    "-loop", "1", "-i", framePath,
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-t", totalDur,
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-vf", vfChain,
    outClipPath,
  ]);
  console.log(`  Beat ${beatId}: ${totalDur}s (${totalFrames}f) → ${path.basename(outClipPath)}`);
  return { path: outClipPath, duration: parseFloat(totalDur), vfChain };
}

async function assembleReel(reelId) {
  const scenario = SCENARIOS[reelId];
  if (!scenario) throw new Error(`Unknown reel '${reelId}'. Known: ${Object.keys(SCENARIOS).join(", ")}`);

  const buildDir = path.join(BUILD_ROOT, reelId);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n=== Assembling '${reelId}' reel (${scenario.beats.length} beats, voice ${scenario.voice}) ===`);
  console.log(`  Build dir: ${buildDir}`);
  console.log(`  KEN_BURNS: ${KEN_BURNS ? "ON (zoompan)" : "OFF (static frames)"}`);

  const browser = await chromium.launch({ headless: true });
  const clipPaths = [];
  let zoompanString = "";

  for (const beat of scenario.beats) {
    console.log(`\nBeat ${beat.id}:`);
    if (!fs.existsSync(beat.frame)) throw new Error(`Missing source frame: ${beat.frame}`);

    // 1. TTS
    const audioPath = path.join(buildDir, `${beat.id}.m4a`);
    await sayText(beat.narration, audioPath, scenario.voice);

    // 2. Burn subtitle caption (shortened for on-screen legibility)
    const subtitledPath = path.join(buildDir, `${beat.id}-subtitled.png`);
    const subtitle = beat.narration.length > 90
      ? beat.narration.slice(0, beat.narration.lastIndexOf(" ", 90)) + "..."
      : beat.narration;
    await renderSubtitleFrame(browser, beat.frame, subtitle, subtitledPath);

    // 3. Beat clip with top-anchored Ken-Burns
    const clipPath = path.join(buildDir, `${beat.id}.mp4`);
    const timing = buildBeatClip(beat.id, subtitledPath, audioPath, clipPath);
    clipPaths.push(clipPath);
    zoompanString = timing.vfChain; // capture for reporting
  }

  await browser.close();

  // 4. Concat (simple demuxer — all segments share identical 1280x720/30fps/aac geometry)
  const concatListPath = path.join(buildDir, "concat.txt");
  fs.writeFileSync(concatListPath, clipPaths.map(p => `file '${p}'`).join("\n") + "\n");

  const outputMp4 = path.join(OUT_DIR, `${scenario.output}.mp4`);
  execFileSync("ffmpeg", [
    "-y",
    "-f", "concat", "-safe", "0", "-i", concatListPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    outputMp4,
  ]);
  console.log(`\nFinal MP4: ${outputMp4}`);

  // 5. Extract combined audio track
  const outputM4a = path.join(OUT_DIR, `${scenario.output}.m4a`);
  execFileSync("ffmpeg", [
    "-y", "-i", outputMp4, "-vn", "-c:a", "aac", "-b:a", "128k", outputM4a,
  ]);
  console.log(`Final M4A: ${outputM4a}`);

  return { mp4: outputMp4, m4a: outputM4a, zoompan: zoompanString };
}

function probeAndAssert(label, fpath) {
  const info = JSON.parse(execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", fpath
  ]).toString());
  const duration = parseFloat(info.format.duration);
  const sizeBytes = parseInt(info.format.size);
  const videoStream = info.streams.find(s => s.codec_type === "video");
  const audioStream = info.streams.find(s => s.codec_type === "audio");
  const result = {
    vcodec: videoStream?.codec_name,
    acodec: audioStream?.codec_name,
    width: videoStream?.width,
    height: videoStream?.height,
    duration,
    bytes: sizeBytes,
  };
  console.log(`\n${label} ffprobe:`);
  console.log(`  vcodec:   ${result.vcodec} (${result.width}x${result.height})`);
  console.log(`  acodec:   ${result.acodec}`);
  console.log(`  duration: ${duration.toFixed(2)}s`);
  console.log(`  bytes:    ${sizeBytes} (${(sizeBytes / 1024).toFixed(0)} KB)`);

  if (result.vcodec !== "h264") throw new Error(`${label}: vcodec is ${result.vcodec}, expected h264`);
  if (result.acodec !== "aac") throw new Error(`${label}: acodec is ${result.acodec}, expected aac`);
  if (!(duration > 0)) throw new Error(`${label}: duration ${duration} not > 0`);
  if (!(sizeBytes > 100 * 1024)) throw new Error(`${label}: ${sizeBytes} bytes not > 100KB`);
  console.log(`  PASS: vcodec=h264, acodec=aac, duration>0, bytes>100KB`);
  return result;
}

async function main() {
  const reelIdx = process.argv.indexOf("--reel");
  const reelId = reelIdx >= 0 ? process.argv[reelIdx + 1] : "cfo";

  const result = await assembleReel(reelId);
  const probe = probeAndAssert(`'${reelId}' MP4`, result.mp4);

  console.log(`\n=== DoD report ===`);
  console.log(`Final MP4:  ${result.mp4}`);
  console.log(`Final M4A:  ${result.m4a}`);
  console.log(`KEN_BURNS:  ${KEN_BURNS ? "ON" : "OFF (static frames)"}`);
  console.log(`vf chain:   ${result.zoompan}`);
  console.log(`ffprobe: vcodec=${probe.vcodec} acodec=${probe.acodec} duration=${probe.duration.toFixed(2)}s bytes=${probe.bytes}`);
}

main().catch(e => { console.error(e); process.exit(1); });
