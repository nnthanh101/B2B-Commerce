#!/usr/bin/env node
/**
 * Assemble SRE Reel — Operate & Keep It Healthy
 * scope_id: B2B-RELEASE-READINESS-2026-06-09 / RR-04c
 *
 * 4-beat arc: Grafana hero → Prometheus targets UP → Prometheus p95 query → Keycloak IdP health
 * TTS: Daniel (en_GB), macOS `say`
 * Assembly: static frames + xfade crossfades (fill_crop mode, 16:9 source)
 * Output: docs/static/video/demo/flows/sre-operate-observability.mp4
 *
 * HONESTY RULE (binding): narration frames capability only — no fabricated SLA/MTTD numbers.
 */

import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const TMP_DIR   = path.join(REPO_ROOT, "tmp/B2B-Commerce/reel-assembly");
const OUT_DIR   = path.join(REPO_ROOT, "docs/static/video/demo/flows");
const VOICE     = "Daniel"; // en_GB

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// SRE reel beats
// Frames: docs/static/img/demo/flows/sre-operate-observability/ (captured by capture-sre-fresh.mjs)
// Narration: verbatim from docs/content/demo/reel-sre-narration.md
// Role-bar: "Oliver · SRE / Platform Engineering" baked into each PNG by capture-sre-fresh.mjs
// HONESTY: capability framing only — no fabricated SLA/MTTD/uptime percentages
const SRE_BEATS = [
  {
    // Beat 1 — Hero cold-open: full Grafana dashboard with four golden signals
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/sre-operate-observability/grafana-dashboard-hero.png"),
    narration: "Four golden signals — one board. This is the operating picture for B2B-Commerce right now. Latency, traffic, errors, and saturation, all measured from live traffic. When something degrades, it shows up here.",
  },
  {
    // Beat 2 — Prometheus targets: every target UP, 15s scrape interval
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/sre-operate-observability/prometheus-targets-up.png"),
    narration: "Four targets — b2b-commerce, Postgres, Redis, and node — all UP, all scraped every fifteen seconds. That scrape interval is the platform's heartbeat. If a target goes down, Prometheus knows within one scrape window.",
  },
  {
    // Beat 3 — Prometheus graph: live p95 latency PromQL query
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/sre-operate-observability/prometheus-p95-query.png"),
    narration: "This is p95 request latency — queried live from Prometheus right now. The expression browser lets an SRE interrogate any metric in real time. No dashboards needed: the data layer is directly queryable.",
  },
  {
    // Beat 4 — Keycloak IdP health: realm live, OIDC discovery 200
    id: "beat4",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/sre-operate-observability/keycloak-idp-health.png"),
    narration: "The identity provider is healthy. Keycloak's medusa-commerce realm is live — the OIDC discovery endpoint returns two hundred, token and account services are reachable. Authentication is the first dependency that breaks a login flow; we can see it's operating normally.",
  },
];

// ─── Helpers (verbatim from assemble-reels.mjs) ───────────────────────────────

async function generatePlaceholderFrame(text, outPath) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await page.setContent(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1280px;height:720px;background:#1a1a2e;display:flex;flex-direction:column;justify-content:center;align-items:center}
    h2{color:#e8e8e8;font:700 28px/1.4 system-ui;text-align:center;padding:0 60px;max-width:1100px}
    .logo{color:#6c8ebf;font:600 18px system-ui;margin-bottom:24px;letter-spacing:2px}
  </style></head><body>
    <div class="logo">B2B COMMERCE · SRE DEMO</div>
    <h2>${escaped}</h2>
  </body></html>`);
  await page.waitForTimeout(500);
  const buf = await page.screenshot({ type: "png" });
  fs.writeFileSync(outPath, buf);
  await ctx.close();
  await browser.close();
  return outPath;
}

async function renderSubtitleFrame(browser, framePath, subtitle, outPath) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const imgData = fs.readFileSync(framePath);
  const b64 = imgData.toString("base64");
  const escaped = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
  const buf = await page.screenshot({ type: "png" });
  fs.writeFileSync(outPath, buf);
  await ctx.close();
  return outPath;
}

function sayText(text, outPath, voice = VOICE) {
  return new Promise((resolve, reject) => {
    const proc = spawn("say", ["-v", voice, "-o", outPath, text]);
    proc.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`say exited ${code}`));
    });
  });
}

function getAudioDuration(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", filePath
  ]).toString();
  const data = JSON.parse(out);
  return parseFloat(data.format.duration);
}

async function buildBeatClip(beatId, framePath, audioPath, outClipPath) {
  const duration = getAudioDuration(audioPath);
  const totalDur = (duration + 0.4).toFixed(2);

  // fill_crop: scale to fill 1280x720, crop any overflow from center.
  // For true 16:9 sources (2560x1440 from capture-sre-fresh.mjs) crop is 0px.
  const vfFillCrop = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";

  execFileSync("ffmpeg", [
    "-y",
    "-loop", "1", "-i", framePath,
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-t", totalDur,
    "-pix_fmt", "yuv420p",
    "-vf", vfFillCrop,
    outClipPath,
  ]);
  console.log(`  Beat ${beatId}: ${totalDur}s [full-bleed] → ${outClipPath}`);
  return { path: outClipPath, duration: parseFloat(totalDur) };
}

function formatSRTTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.round((secs - Math.floor(secs)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
function pad3(n) { return String(n).padStart(3, "0"); }
function wrapText(text, maxLen) {
  if (text.length <= maxLen) return text;
  const mid = Math.floor(text.length / 2);
  const split = text.lastIndexOf(" ", mid);
  if (split < 0) return text;
  return text.slice(0, split) + "\n" + text.slice(split + 1);
}

function buildSRT(beatTimings) {
  let srt = "";
  let idx = 1;
  let cursor = 0;
  for (const { narration, duration } of beatTimings) {
    const start = formatSRTTime(cursor);
    const end   = formatSRTTime(cursor + duration - 0.3);
    const wrapped = wrapText(narration, 80);
    srt += `${idx}\n${start} --> ${end}\n${wrapped}\n\n`;
    idx++;
    cursor += duration;
  }
  return srt;
}

// ─── Main assembly ─────────────────────────────────────────────────────────────

async function main() {
  const reelName  = "sre";
  const outputMp4 = path.join(OUT_DIR, "sre-operate-observability.mp4");
  const reelTmp   = path.join(TMP_DIR, reelName);
  fs.mkdirSync(reelTmp, { recursive: true });

  console.log(`\n=== Assembling SRE reel (${SRE_BEATS.length} beats, fill_crop + xfade) ===`);

  const browser = await chromium.launch({ headless: true });
  const beatTimings = [];
  const clipPaths   = [];

  for (const beat of SRE_BEATS) {
    console.log(`\nBeat ${beat.id}:`);

    // 1. Generate TTS audio
    const audioPath = path.join(reelTmp, `${beat.id}.m4a`);
    await sayText(beat.narration, audioPath);
    console.log(`  Audio: ${audioPath}`);

    // 2. Resolve frame
    let framePath = beat.frame;
    if (!framePath || !fs.existsSync(framePath)) {
      const placeholderPath = path.join(reelTmp, `${beat.id}-placeholder.png`);
      const shortText = beat.narration.slice(0, 80) + (beat.narration.length > 80 ? "..." : "");
      await generatePlaceholderFrame(shortText, placeholderPath);
      framePath = placeholderPath;
      console.log(`  Frame: placeholder (source PNG missing)`);
    } else {
      console.log(`  Frame: ${path.basename(framePath)}`);
    }

    // 3. Render subtitle overlay
    const subtitledFramePath = path.join(reelTmp, `${beat.id}-subtitled.png`);
    const subtitle = beat.narration.length > 90
      ? beat.narration.slice(0, beat.narration.lastIndexOf(" ", 90)) + "..."
      : beat.narration;
    await renderSubtitleFrame(browser, framePath, subtitle, subtitledFramePath);

    // 4. Build beat clip (fill_crop — 16:9 source, no letterbox)
    const clipPath = path.join(reelTmp, `${beat.id}.mp4`);
    const timing = await buildBeatClip(beat.id, subtitledFramePath, audioPath, clipPath);
    clipPaths.push(clipPath);
    beatTimings.push({ narration: beat.narration, duration: timing.duration });
  }

  await browser.close();

  // 5. Write SRT
  const srtPath = path.join(reelTmp, `${reelName}.srt`);
  fs.writeFileSync(srtPath, buildSRT(beatTimings));
  console.log(`\nSRT written: ${srtPath}`);

  // 6. Concatenate with xfade crossfades (0.5s fade between beats)
  const XFADE_DUR = 0.5;
  const inputArgs = clipPaths.flatMap(p => ["-i", p]);
  const n = clipPaths.length;
  let vFilter = "";
  let aFilter = "";
  let offset  = 0;
  for (let i = 0; i < n - 1; i++) {
    const inV  = i === 0 ? `[${i}:v]` : `[xv${i}]`;
    const inA  = i === 0 ? `[${i}:a]` : `[xa${i}]`;
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
  console.log(`\nFinal MP4 (xfade crossfades): ${outputMp4}`);

  // 7. Extract audio track
  const outputM4a = outputMp4.replace(".mp4", ".m4a");
  execFileSync("ffmpeg", [
    "-y",
    "-i", outputMp4,
    "-vn", "-c:a", "aac", "-b:a", "128k",
    outputM4a,
  ]);
  console.log(`Final M4A: ${outputM4a}`);

  // 8. ffprobe verification
  const info = JSON.parse(execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", outputMp4
  ]).toString());
  const duration   = parseFloat(info.format.duration);
  const sizeBytes  = parseInt(info.format.size);
  const videoStream = info.streams.find(s => s.codec_type === "video");
  const audioStream = info.streams.find(s => s.codec_type === "audio");

  console.log(`\nSRE MP4:`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);
  console.log(`  Size: ${(sizeBytes / 1024).toFixed(0)} KB`);
  console.log(`  Video: ${videoStream?.codec_name} ${videoStream?.width}x${videoStream?.height}`);
  console.log(`  Audio: ${audioStream?.codec_name}`);

  if (duration <= 0)                          throw new Error("SRE MP4: duration is 0");
  if (sizeBytes < 100 * 1024)                throw new Error("SRE MP4: file too small (<100KB)");
  if (videoStream?.codec_name !== "h264")    throw new Error("SRE MP4: not h264 video");
  if (audioStream?.codec_name !== "aac")     throw new Error("SRE MP4: not aac audio");
  if (videoStream?.width !== 1280)           throw new Error(`SRE MP4: width ${videoStream?.width} != 1280`);
  if (videoStream?.height !== 720)           throw new Error(`SRE MP4: height ${videoStream?.height} != 720`);

  console.log(`  PASS: h264 1280x720 + aac, dur=${duration.toFixed(1)}s, ${(sizeBytes/1024).toFixed(0)}KB`);
  console.log(`\n=== SRE assembly COMPLETE ===`);
  console.log(`  MP4: ${outputMp4}`);
  console.log(`  M4A: ${outputM4a}`);
  console.log(`  SRT: ${srtPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
