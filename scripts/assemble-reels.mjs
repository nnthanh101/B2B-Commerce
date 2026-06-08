#!/usr/bin/env node
/**
 * Assemble 2 demo reels (CEO + CTO) using macOS `say` TTS + ffmpeg.
 *
 * Each beat: narration text → audio (.m4a via `say`) → still frame + audio → beat clip
 * All beat clips → concat → final MP4 with burned-in subtitles (derived from narration SSOT)
 *
 * SRT subtitles: written to tmp/ (transient) — NOT to docs/static/
 * Final MP4 + M4A: written to docs/static/video/demo/flows/
 */

import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/reel-assembly");
const OUT_DIR = path.join(REPO_ROOT, "docs/static/video/demo/flows");
const VOICE = "Daniel"; // en_GB

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// CEO reel beats — frame path + narration text (SSOT: reel-ceo-narration.md)
const CEO_BEATS = [
  {
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote/step-01.png"),
    narration: "Maria is a procurement specialist at a New Zealand manufacturer. Quarter-close is four days away, and her cart holds NZ$4,647 in equipment across three items. Under the legacy process, a single quote means three emails, three sign-offs, and a three-to-five day wait — a window that slips the budget every time.",
  },
  {
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote/step-04.png"),
    narration: "One click converts the cart into a formal quote request. No email chain — a modal confirms the cart becomes a live quote. Maria clicks Submit.",
  },
  {
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote/step-05.png"),
    narration: "The quote is filed in under ninety seconds. Maria's account shows it live, marked Pending Merchant — awaiting sign-off. Her manager is notified instantly. No chasing, no back-and-forth.",
  },
  {
    id: "beat4",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval/step-01.png"),
    narration: "On the admin side, David — Demo Corp's procurement director — sees approval number 2469 land in his queue the moment Maria submits. No forwarded email, no CC chain. The quote routes straight to the right person.",
  },
  {
    id: "beat5",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval/step-05b-govern-approve.png"),
    narration: "David reviews the approval. The spend is on record, the company is identified, and the policy context is clear. He approves — spend stays governed, NZD throughout, decision traceable.",
  },
  {
    id: "beat6",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval/step-06b-approved-audit.png"),
    narration: "Status flipped to Approved. What used to take three to five days took minutes. Maria's budget is protected, the quarter-close window holds, and every decision is on the record. Days became minutes — and the audit trail is built in.",
  },
];

// CTO reel beats — HERO-FIRST order (CTO-AC-1/AC-4: dashboard at t<=3s, intro over hero not black)
// panelId=8 grafana-upstatus-grid beat REMOVED (CTO-AC-2: no 4xUP grid anywhere in reel)
const CTO_BEATS = [
  {
    // beat1: intro hook narration plays OVER the hero dashboard (not over black)
    // CTO-AC-1: first frame = rich Grafana latency+rate dashboard at t<=3s
    // CTO-AC-4: pre-screenshot black segment collapsed to 0s (hook plays over hero)
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png"),
    narration: "Olivia is the CTO at OceanSoft. She trusts a live dashboard — latency percentiles, error rate, real traffic. This is what production-ready looks like.",
  },
  {
    // beat2: Prometheus targets — 4/4 UP (after hero, not cold-open)
    // CTO-AC-6: appears AFTER the hero
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/prometheus-targets-up.png"),
    narration: "Prometheus is scraping four targets — the Medusa backend, Node exporter, Postgres exporter, and Redis exporter. Every component reports in. This is instrumented from minute one — not bolted on after the first incident.",
  },
  {
    // beat3: Grafana dashboard revisited — deep panel narration
    // CTO-AC-5: panels populated (p50/p95/p99 + 2xx rate > 0)
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png"),
    narration: "The Grafana commerce dashboard reacts to the traffic. Latency percentiles — p50, p95, and p99 — show real request timing. The request-rate panel breaks out 2xx success from 4xx client errors. The slow tail is visible; averages do not hide it. Mean-time-to-detect begins here. The answer to 'can we run this in production?' is yes — and here is the proof.",
  },
];

// Generate a placeholder black frame for beats without an actual screenshot
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
    <div class="logo">B2B COMMERCE · DEMO</div>
    <h2>${escaped}</h2>
  </body></html>`);
  await page.waitForTimeout(500);
  const buf = await page.screenshot({ type: "png" });
  fs.writeFileSync(outPath, buf);
  await ctx.close();
  await browser.close();
  return outPath;
}

// Render subtitle overlay on a frame
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

// Run macOS `say` to generate M4A audio from text
function sayText(text, outPath, voice = VOICE) {
  return new Promise((resolve, reject) => {
    const proc = spawn("say", ["-v", voice, "-o", outPath, text]);
    proc.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`say exited ${code}`));
    });
  });
}

// Get audio duration in seconds
function getAudioDuration(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", filePath
  ]).toString();
  const data = JSON.parse(out);
  return parseFloat(data.format.duration);
}

// Build a beat clip: frame PNG + audio M4A → MP4 segment
async function buildBeatClip(beatId, framePath, audioPath, outClipPath) {
  const duration = getAudioDuration(audioPath);
  // Add 0.4s pad at end for smooth transition
  const totalDur = (duration + 0.4).toFixed(2);
  execFileSync("ffmpeg", [
    "-y",
    "-loop", "1", "-i", framePath,
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-t", totalDur,
    "-pix_fmt", "yuv420p",
    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    outClipPath,
  ]);
  console.log(`  Beat ${beatId}: ${totalDur}s → ${outClipPath}`);
  return { path: outClipPath, duration: parseFloat(totalDur) };
}

// Build SRT from beat timings
function buildSRT(beatTimings) {
  let srt = "";
  let idx = 1;
  let cursor = 0;
  for (const { narration, duration } of beatTimings) {
    const start = formatSRTTime(cursor);
    const end = formatSRTTime(cursor + duration - 0.3);
    // Split long narration into two subtitle lines (max ~80 chars per line)
    const wrapped = wrapText(narration, 80);
    srt += `${idx}\n${start} --> ${end}\n${wrapped}\n\n`;
    idx++;
    cursor += duration;
  }
  return srt;
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

async function assembleReel(reelName, beats, outputMp4) {
  console.log(`\n=== Assembling ${reelName} reel (${beats.length} beats) ===`);
  const reelTmp = path.join(TMP_DIR, reelName);
  fs.mkdirSync(reelTmp, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const beatTimings = [];
  const clipPaths = [];

  for (const beat of beats) {
    console.log(`\nBeat ${beat.id}:`);

    // 1. Generate audio
    const audioPath = path.join(reelTmp, `${beat.id}.m4a`);
    await sayText(beat.narration, audioPath);
    console.log(`  Audio: ${audioPath}`);

    // 2. Resolve frame
    let framePath = beat.frame;
    if (!framePath || !fs.existsSync(framePath)) {
      // Generate placeholder
      const placeholderPath = path.join(reelTmp, `${beat.id}-placeholder.png`);
      const shortText = beat.narration.slice(0, 80) + (beat.narration.length > 80 ? "..." : "");
      await generatePlaceholderFrame(shortText, placeholderPath);
      framePath = placeholderPath;
      console.log(`  Frame: placeholder`);
    } else {
      console.log(`  Frame: ${path.basename(framePath)}`);
    }

    // 3. Render subtitle overlay
    const subtitledFramePath = path.join(reelTmp, `${beat.id}-subtitled.png`);
    // Use a shorter subtitle: first 80 chars of narration
    const subtitle = beat.narration.length > 90
      ? beat.narration.slice(0, beat.narration.lastIndexOf(" ", 90)) + "..."
      : beat.narration;
    await renderSubtitleFrame(browser, framePath, subtitle, subtitledFramePath);

    // 4. Build beat clip
    const clipPath = path.join(reelTmp, `${beat.id}.mp4`);
    const timing = await buildBeatClip(beat.id, subtitledFramePath, audioPath, clipPath);
    clipPaths.push(clipPath);
    beatTimings.push({ narration: beat.narration, duration: timing.duration });
  }

  await browser.close();

  // 5. Write SRT to tmp (transient — not to docs/static)
  const srtPath = path.join(reelTmp, `${reelName}.srt`);
  fs.writeFileSync(srtPath, buildSRT(beatTimings));
  console.log(`\nSRT written: ${srtPath}`);

  // 6. Concatenate clips
  const concatListPath = path.join(reelTmp, "concat.txt");
  fs.writeFileSync(concatListPath, clipPaths.map(p => `file '${p}'`).join("\n") + "\n");

  execFileSync("ffmpeg", [
    "-y",
    "-f", "concat", "-safe", "0", "-i", concatListPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    outputMp4,
  ]);
  console.log(`\nFinal MP4: ${outputMp4}`);

  // 7. Extract combined audio track
  const outputM4a = outputMp4.replace(".mp4", ".m4a");
  execFileSync("ffmpeg", [
    "-y",
    "-i", outputMp4,
    "-vn", "-c:a", "aac", "-b:a", "128k",
    outputM4a,
  ]);
  console.log(`Final M4A: ${outputM4a}`);

  return { mp4: outputMp4, m4a: outputM4a, srt: srtPath };
}

async function main() {
  const ceoMp4 = path.join(OUT_DIR, "ceo-cart-quote-approval.mp4");
  const ctoMp4 = path.join(OUT_DIR, "cto-operate-observability.mp4");

  const ceoResult = await assembleReel("ceo", CEO_BEATS, ceoMp4);
  const ctoResult = await assembleReel("cto", CTO_BEATS, ctoMp4);

  console.log("\n=== Assembly complete ===");
  console.log(`CEO MP4: ${ceoResult.mp4}`);
  console.log(`CEO M4A: ${ceoResult.m4a}`);
  console.log(`CTO MP4: ${ctoResult.mp4}`);
  console.log(`CTO M4A: ${ctoResult.m4a}`);

  // ffprobe verification
  for (const [label, fpath] of [["CEO MP4", ceoMp4], ["CTO MP4", ctoMp4]]) {
    const info = JSON.parse(execFileSync("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", fpath
    ]).toString());
    const duration = parseFloat(info.format.duration);
    const sizeBytes = parseInt(info.format.size);
    const videoStream = info.streams.find(s => s.codec_type === "video");
    const audioStream = info.streams.find(s => s.codec_type === "audio");
    console.log(`\n${label}:`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
    console.log(`  Size: ${(sizeBytes / 1024).toFixed(0)} KB`);
    console.log(`  Video: ${videoStream?.codec_name} ${videoStream?.width}x${videoStream?.height}`);
    console.log(`  Audio: ${audioStream?.codec_name}`);
    if (duration <= 0) throw new Error(`${label}: duration is 0`);
    if (sizeBytes < 100 * 1024) throw new Error(`${label}: file too small (<100KB)`);
    if (videoStream?.codec_name !== "h264") throw new Error(`${label}: not h264 video`);
    if (audioStream?.codec_name !== "aac") throw new Error(`${label}: not aac audio`);
    console.log(`  PASS: h264+aac, dur>0, >100KB`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
