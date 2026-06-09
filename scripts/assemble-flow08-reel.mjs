#!/usr/bin/env node
/**
 * Assemble flow-08 order-edit narrated MP4
 *
 * Uses the same pattern as assemble-reels.mjs:
 *   beat narration → macOS say TTS → M4A audio
 *   frame PNG + audio → beat MP4 clip (fill_crop mode — full-bleed 16:9)
 *   clips concat → final narrated MP4 with subtitle overlay
 *
 * Narration text sourced verbatim from docs/content/demo/flows/08-order-edit.md
 * voice script (timestamps [00:08], [00:16], [00:24], [00:31], [00:39]).
 *
 * Output: docs/static/video/demo/flows/flow-08-order-edit.mp4
 */

import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/reel-assembly/flow08");
const OUT_DIR = path.join(REPO_ROOT, "docs/static/video/demo/flows");
const STILLS_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/08-order-edit");
const VOICE = "Daniel"; // en_GB — matches existing reels

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Flow-08 beats — narration sourced from 08-order-edit.md voice script
 * Frames: real captured stills from the admin order-edit UI
 *
 * NZD values (NZ$318.00 = 2× Wireless Keyboard at NZ$159.00) are real seeded demo data.
 * Honesty rule: these are demo data values, not production KPIs.
 */
const FLOW08_BEATS = [
  {
    id: "beat1",
    // Admin orders list — see the seeded order #2 in the list
    frame: path.join(STILLS_DIR, "step-01.png"),
    narration: "Order Editing lets admins adjust post-purchase line items without reissuing invoices. Priya opens the admin console and sees order number 2 — a Demo Corp purchase of two wireless keyboards at NZ$318.00 — landed in her queue.",
  },
  {
    id: "beat2",
    // Order detail — full summary with NZD totals, customer info, activity log
    frame: path.join(STILLS_DIR, "step-02.png"),
    narration: "She opens the order. The summary shows two keyboards at NZ$159.00 each — order total NZ$318.00. The activity log records the exact moment the order was placed. All values are in New Zealand dollars throughout.",
  },
  {
    id: "beat3",
    // Edit Order widget — shows line items with edit/remove controls, Add item button
    frame: path.join(STILLS_DIR, "step-03.png"),
    narration: "The Edit Order panel appears directly below the unfulfilled items. Priya can adjust the quantity with the pencil icon, remove a line item with the X, or click Add item to include a new product. Current total and new total update live as she makes changes.",
  },
  {
    id: "beat4",
    // Order totals (step-04 — scrolled to 85% showing totals area)
    frame: path.join(STILLS_DIR, "step-04.png"),
    narration: "The current total sits at NZ$318.00. As Priya edits quantities or removes items, the new total recalculates instantly — no page reload, no re-invoicing. She confirms the edit and the audit log records the change with her name and timestamp.",
  },
  {
    id: "beat5",
    // Order header — order number, status badges, date, customer
    frame: path.join(STILLS_DIR, "step-05.png"),
    narration: "Every edit is traceable. The order header carries the status badges, the originating sales channel, and the customer record. The backend order-edit API is live — giving sales managers full post-checkout control with a complete audit trail.",
  },
];

// ---------------------------------------------------------------------------
// Helpers — mirrored from assemble-reels.mjs
// ---------------------------------------------------------------------------

function sayText(text, outPath, voice = VOICE) {
  return new Promise((resolve, reject) => {
    const proc = spawn("say", ["-v", voice, "-o", outPath, text]);
    proc.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`say exited ${code} for "${text.slice(0, 40)}..."`));
    });
  });
}

function getAudioDuration(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", filePath,
  ]).toString();
  return parseFloat(JSON.parse(out).format.duration);
}

async function generatePlaceholderFrame(text, outPath) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await page.setContent(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1280px;height:720px;background:#1a1a2e;display:flex;flex-direction:column;justify-content:center;align-items:center}
    h2{color:#e8e8e8;font:700 28px/1.4 system-ui;text-align:center;padding:0 60px;max-width:1100px}
    .logo{color:#6c8ebf;font:600 18px system-ui;margin-bottom:24px;letter-spacing:2px}
  </style></head><body>
    <div class="logo">B2B COMMERCE · DEMO</div>
    <h2>${escaped}</h2>
  </body></html>`);
  await page.waitForTimeout(500);
  fs.writeFileSync(outPath, await page.screenshot({ type: "png" }));
  await ctx.close();
  await browser.close();
  return outPath;
}

async function renderSubtitleFrame(browser, framePath, subtitle, outPath) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const b64 = fs.readFileSync(framePath).toString("base64");
  const escaped = subtitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await page.setContent(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1280px;height:720px;overflow:hidden;position:relative}
    .frame{width:1280px;height:720px;background:url("data:image/png;base64,${b64}") top/cover no-repeat}
    .sub{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.75);color:#fff;font:bold 20px/1.4 system-ui,sans-serif;
      padding:10px 28px;border-radius:6px;text-align:center;max-width:1100px;white-space:pre-wrap}
  </style></head><body>
    <div class="frame"></div>
    <div class="sub">${escaped}</div>
  </body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  fs.writeFileSync(outPath, await page.screenshot({ type: "png" }));
  await ctx.close();
  return outPath;
}

function buildBeatClip(beatId, framePath, audioPath, outClipPath) {
  const duration = getAudioDuration(audioPath);
  const totalDur = (duration + 0.4).toFixed(2);
  // fill_crop: scale to fill 1280x720, crop center (same as CTO reel)
  const vfChain = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";
  execFileSync("ffmpeg", [
    "-y",
    "-loop", "1", "-i", framePath,
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-t", totalDur,
    "-pix_fmt", "yuv420p",
    "-vf", vfChain,
    outClipPath,
  ]);
  console.log(`  Beat ${beatId}: ${totalDur}s [full-bleed] → ${path.basename(outClipPath)}`);
  return { path: outClipPath, duration: parseFloat(totalDur) };
}

// ---------------------------------------------------------------------------
// Main assembly
// ---------------------------------------------------------------------------

async function main() {
  const outputMp4 = path.join(OUT_DIR, "flow-08-order-edit.mp4");

  console.log("=".repeat(60));
  console.log("Flow 08 — Order Editing — assemble narrated MP4");
  console.log(`Output: ${outputMp4}`);
  console.log("=".repeat(60));

  const browser = await chromium.launch({ headless: true });
  const clipPaths = [];
  const beatTimings = [];

  for (const beat of FLOW08_BEATS) {
    console.log(`\nBeat ${beat.id}:`);

    // 1. TTS audio
    const audioPath = path.join(TMP_DIR, `${beat.id}.m4a`);
    await sayText(beat.narration, audioPath);
    console.log(`  Audio: ${path.basename(audioPath)}`);

    // 2. Resolve frame
    let framePath = beat.frame;
    if (!framePath || !fs.existsSync(framePath)) {
      const placeholderPath = path.join(TMP_DIR, `${beat.id}-placeholder.png`);
      const shortText = beat.narration.slice(0, 80) + (beat.narration.length > 80 ? "..." : "");
      await generatePlaceholderFrame(shortText, placeholderPath);
      framePath = placeholderPath;
      console.log(`  Frame: placeholder (${beat.frame} missing)`);
    } else {
      console.log(`  Frame: ${path.basename(framePath)}`);
    }

    // 3. Subtitle overlay
    const subtitledPath = path.join(TMP_DIR, `${beat.id}-subtitled.png`);
    const subtitle = beat.narration.length > 90
      ? beat.narration.slice(0, beat.narration.lastIndexOf(" ", 90)) + "..."
      : beat.narration;
    await renderSubtitleFrame(browser, framePath, subtitle, subtitledPath);

    // 4. Beat clip
    const clipPath = path.join(TMP_DIR, `${beat.id}.mp4`);
    const timing = buildBeatClip(beat.id, subtitledPath, audioPath, clipPath);
    clipPaths.push(clipPath);
    beatTimings.push({ narration: beat.narration, duration: timing.duration });
  }

  await browser.close();

  // 5. Concatenate clips with xfade crossfades (same as CTO reel)
  console.log("\nConcatenating clips with xfade crossfades...");
  const XFADE_DUR = 0.5;
  const n = clipPaths.length;
  const inputArgs = clipPaths.flatMap(p => ["-i", p]);

  let vFilter = "";
  let aFilter = "";
  let offset = 0;
  for (let i = 0; i < n - 1; i++) {
    const inV = i === 0 ? `[${i}:v]` : `[xv${i}]`;
    const inA = i === 0 ? `[${i}:a]` : `[xa${i}]`;
    offset += beatTimings[i].duration - XFADE_DUR;
    const outV = i === n - 2 ? "[vout]" : `[xv${i + 1}]`;
    const outA = i === n - 2 ? "[aout]" : `[xa${i + 1}]`;
    vFilter += `${inV}[${i + 1}:v]xfade=transition=fade:duration=${XFADE_DUR}:offset=${offset.toFixed(3)}${outV};`;
    aFilter += `${inA}[${i + 1}:a]acrossfade=d=${XFADE_DUR}${outA};`;
  }
  const filterComplex = (vFilter + aFilter).replace(/;$/, "");

  execFileSync("ffmpeg", [
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    outputMp4,
  ]);

  // 6. Extract M4A audio track
  const outputM4a = outputMp4.replace(".mp4", ".m4a");
  execFileSync("ffmpeg", [
    "-y", "-i", outputMp4,
    "-vn", "-c:a", "aac", "-b:a", "128k",
    outputM4a,
  ]);

  // 7. Verify final MP4
  const info = JSON.parse(execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json",
    "-show_format", "-show_streams", outputMp4,
  ]).toString());
  const duration = parseFloat(info.format.duration);
  const sizeBytes = parseInt(info.format.size);
  const videoStream = info.streams.find(s => s.codec_type === "video");
  const audioStream = info.streams.find(s => s.codec_type === "audio");

  console.log("\n=== Final MP4 verification ===");
  console.log(`  File: ${outputMp4}`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);
  console.log(`  Size: ${(sizeBytes / 1024).toFixed(0)} KB`);
  console.log(`  Video: ${videoStream?.codec_name} ${videoStream?.width}x${videoStream?.height}`);
  console.log(`  Audio: ${audioStream?.codec_name}`);

  if (duration <= 0) throw new Error("MP4 duration is 0");
  if (sizeBytes < 100 * 1024) throw new Error("MP4 file too small (<100KB)");
  if (videoStream?.codec_name !== "h264") throw new Error("Not h264 video");
  if (audioStream?.codec_name !== "aac") throw new Error("Not aac audio");

  console.log("  PASS: h264+aac, dur>0, >100KB");
  console.log(`\nFinal MP4: ${outputMp4}`);
  console.log(`Final M4A: ${outputM4a}`);
}

main().catch(e => { console.error(e); process.exit(1); });
