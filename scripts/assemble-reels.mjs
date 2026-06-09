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

// CEO reel beats — REBUILT with SSO opening arc (scope_id: B2B-RELEASE-READINESS-2026-06-09, story RR-04b)
// Beat order: SSO login → SSO Keycloak form → SSO authenticated → cart/limit/quote/approval/audit
// SSOT: docs/content/demo/reel-ceo-narration.md
const CEO_BEATS = [
  {
    // Beat 0a: Storefront login page — "Sign in with SSO" button highlighted
    id: "beat0a",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/00-sso-login/step-01.png"),
    narration: "Before Maria submits a single quote, she needs to sign in. B2B Commerce supports enterprise SSO — she clicks Sign in with SSO, and the platform hands off to the company's identity provider.",
  },
  {
    // Beat 0b: Real Keycloak login form — credentials entered
    id: "beat0b",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/00-sso-login/step-02.png"),
    narration: "The real Keycloak login form. Maria enters her corporate credentials once — her identity is verified by the company's identity provider. No shared passwords. No IT tickets. Governed access from the first click.",
  },
  {
    // Beat 0c: Authenticated SSO account — "Hello SSO" / "Signed in as: sso.buyer@demo.com"
    id: "beat0c",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/00-sso-login/step-03.png"),
    narration: "Authenticated. Hello SSO — the account dashboard lands with her identity confirmed. Signed in as sso.buyer@demo.com via Keycloak. The governance chain starts here, before a single cart item is added.",
  },
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

// CTO reel beats — SRE-grade 5-beat arc (scope_id: dc-b2b-cto-sre-upgrade)
// Narration: verbatim from docs/content/demo/reel-cto-narration.md (USE VERBATIM per CA)
// Assembly: crisp static frames + 0.5s xfade crossfade between beats (no Ken-Burns zoompan).
//   Rationale: dense Grafana dashboards with fine text (p95 ms values, legend numbers) are
//   maximally readable when static. Zoompan on a downscaled source is blurry/unprofessional.
//   Full-bleed 16:9 source (2560x1440 from capture-cto-fresh.mjs) → scale=1280:720, no bars.
// Role-bar "Olivia · CTO / Platform" baked into every PNG by capture-cto-fresh.mjs.
// panelId=8 grafana-upstatus-grid stays REMOVED (CTO-AC-2).
const CTO_BEATS = [
  {
    // Beat 1 — Hero cold-open (CTO-SRE-AC-1: hook <=3-5s, rich dashboard first frame)
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png"),
    narration: "Four golden signals, one board — this is how we run B2B-Commerce in production. Latency, traffic, errors, and saturation. Real data, reacting to real traffic.",
  },
  {
    // Beat 2 — SLI: p95 latency is the indicator (CTO-SRE-AC-3: SLI framed honestly)
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png"),
    narration: "p95 latency is our service-level indicator — the slow-tail percentile that users feel. The SLO is the target we commit to. Here's the real p95 from live traffic, and here's the headroom to our goal.",
  },
  {
    // Beat 3 — RED: errors and traffic by status (CTO-SRE-AC-2: RED mapped to panel2)
    // No 5xx line (zero server errors = healthy). Narration uses capability framing (CA R2).
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-latency-rate-panels.png"),
    narration: "Errors aren't a single number — they're broken out by status. 2xx success, 4xx client. If a 5xx climbs, I see the failure mode broken out here, not just 'something broke'. That's RED — rate and errors — at request granularity.",
  },
  {
    // Beat 4 — Saturation: panels 3 (PG conn) + 6 (Redis Mem Used) + 7 (Node CPU)
    // panel6 Redis Memory Used (gauge ~1.68MB, always populated — CA R3 ruling).
    id: "beat4",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/grafana-saturation-panels.png"),
    narration: "Saturation — the fourth signal. Postgres connections, Node CPU, Redis memory. The platform underneath has headroom. Healthy by measurement, not hope.",
  },
  {
    // Beat 5 — MTTD close: Prometheus 4/4 UP (CTO-SRE-AC-8: MTTD=15s evidence-bound)
    id: "beat5",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/observability/prometheus-targets-up.png"),
    narration: "Four targets, scraped every fifteen seconds. b2b-commerce, Postgres, Redis, Node — all UP. Mean-time-to-detect is one scrape interval, not a customer phone call. Instrumented from minute one. We ship fast — and we'd know within seconds if it broke.",
  },
];

// VI CEO reel beats — POLISHED Vietnamese narration, Linh TTS, /vn region ₫ frames
// Narration SSOT: docs/content/demo/reel-ceo-narration-vi.md (USE VERBATIM)
// Role-bar labels (vi): Maria · Chuyên viên Thu mua (beats 1-3); David · Giám đốc Thu mua (beats 4-6)
// Cart total ₫70,425,000 measured from live /vn capture (2026-06-08) — matches beat-1 narration.
const CEO_VI_BEATS = [
  {
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote-vn/step-01.png"),
    narration: "Maria phụ trách thu mua cho một nhà máy ở Việt Nam. Chỉ còn bốn ngày là tới kỳ chốt quý, mà giỏ hàng hôm nay đã lên tới bảy mươi triệu bốn trăm hai mươi lăm nghìn đồng Việt Nam cho ba mặt hàng. Theo cách làm cũ, một báo giá là phải qua lại email mấy lượt, xin chữ ký từng cấp, chờ ba đến năm ngày — lần nào cũng đủ để trễ ngân sách.",
    voice: "Linh",
  },
  {
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote-vn/step-04.png"),
    narration: "Giờ thì chỉ một cú nhấp, cả giỏ hàng thành ngay một yêu cầu báo giá chính thức. Không còn chuỗi email — chỉ một bước xác nhận, rồi giỏ hàng thành báo giá. Maria bấm Gửi.",
    voice: "Linh",
  },
  {
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote-vn/step-05.png"),
    narration: "Chưa đầy chín mươi giây, báo giá đã vào hệ thống. Maria thấy nó hiện ngay trên tài khoản, đang chờ nhà cung cấp xác nhận. Cấp trên của cô cũng được báo tức thì. Không phải nhắc, không phải hỏi tới hỏi lui.",
    voice: "Linh",
  },
  {
    id: "beat4",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval-vn/step-01.png"),
    narration: "Phía quản trị, David — giám đốc thu mua — thấy yêu cầu nằm sẵn trong hàng chờ duyệt ngay lúc Maria vừa gửi. Không phải chuyển tiếp email, không CC lòng vòng. Báo giá chạy thẳng tới đúng người cần duyệt.",
    voice: "Linh",
  },
  {
    id: "beat5",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval-vn/step-05b-govern-approve.png"),
    narration: "David xem qua một lượt: khoản chi rõ ràng, đúng công ty, đúng chính sách. Anh duyệt chỉ bằng một thao tác — chi tiêu vẫn nằm trong hạn mức, tính bằng đồng Việt Nam, và mỗi quyết định đều có nhật ký kiểm toán đi kèm.",
    voice: "Linh",
  },
  {
    id: "beat6",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval-vn/step-06b-approved-audit.png"),
    narration: "Trạng thái chuyển sang Đã Duyệt. Việc trước đây mất ba đến năm ngày, giờ gói gọn trong vài phút. Ngân sách của Maria được giữ, kịp kỳ chốt quý, và mọi quyết định đều có hồ sơ. Ngày rút thành phút — mà vẫn nắm chắc chi tiêu, đầy đủ nhật ký kiểm toán.",
    voice: "Linh",
  },
];

// Flow 11 beats — Invite Employee, David admin-governance lens, NZD, Daniel voice
// Narration SSOT: docs/content/demo/reel-invite-narration.md
const FLOW11_BEATS = [
  {
    id: "beat1",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/11-invite-employee/step-01.png"),
    narration: "David needs to onboard Sarah, a new procurement specialist. In the admin console, he opens Demo Corp, clicks Add, and fills in Sarah's email and a spending limit of NZ$200. No IT ticket. No manual user creation. The governance parameters are set right here.",
  },
  {
    id: "beat2",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/11-invite-employee/step-02.png"),
    narration: "The system generates a secure invite link. David sends it to Sarah directly — email delivery via SES is in progress. The token is single-use and expires in seven days. No password shared. No access until Sarah accepts.",
  },
  {
    id: "beat3",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/11-invite-employee/step-03.png"),
    narration: "Sarah opens the invite link in her browser. The Accept Invite page is live — a clean form to set her own password. The token was pre-validated server-side. No admin action needed on her side.",
  },
  {
    id: "beat4",
    frame: path.join(REPO_ROOT, "docs/static/img/demo/flows/11-invite-employee/step-04.png"),
    narration: "Sarah's account is active, linked to Demo Corp, with her NZ$200 spending limit already set. She can log in and start purchasing immediately — within the governed limits David configured. Self-service onboarding. Zero back-and-forth.",
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
//
// vfMode controls the scale filter:
//   "fill_crop" (CTO beats): scale to fill 1280x720, crop center — full-bleed, no black bars.
//     Source is 16:9 (2560x1440 from capture-cto-fresh.mjs) so scale=1280:720 is exact, no crop needed.
//     Using fill_crop as the safe universal path for any 16:9-ish source.
//   "letterbox" (CEO beats): scale=decrease + pad — preserves CEO frames (mixed aspect ratios).
//
// CEO beats pass no vfMode → "letterbox" default (unchanged behavior, CEO reel protected).
// CTO beats pass vfMode="fill_crop" → crisp full-bleed output.
async function buildBeatClip(beatId, framePath, audioPath, outClipPath, vfMode) {
  const duration = getAudioDuration(audioPath);
  // Add 0.4s pad at end for smooth transition
  const totalDur = (duration + 0.4).toFixed(2);

  // Fill+crop: scale to FILL the target (no black bars), crop any overflow from center.
  // For true 16:9 sources the crop is 0px — purely a safety net.
  const vfFillCrop = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";
  // Letterbox: scale to fit (with black bars if aspect != 16:9).
  const vfLetterbox = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2";

  const vfChain = (vfMode === "fill_crop") ? vfFillCrop : vfLetterbox;

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
  const modeLabel = vfMode === "fill_crop" ? " [full-bleed]" : " [letterbox]";
  console.log(`  Beat ${beatId}: ${totalDur}s${modeLabel} → ${outClipPath}`);
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

// assembleReel: beatVfMode controls per-beat vf strategy.
//   "fill_crop" = CTO reel (16:9 source, full-bleed, no black bars)
//   "letterbox"  = CEO reel (mixed aspect sources, unchanged behavior)
async function assembleReel(reelName, beats, outputMp4, beatVfMode = "letterbox") {
  console.log(`\n=== Assembling ${reelName} reel (${beats.length} beats, vf=${beatVfMode}) ===`);
  const reelTmp = path.join(TMP_DIR, reelName);
  fs.mkdirSync(reelTmp, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const beatTimings = [];
  const clipPaths = [];

  for (const beat of beats) {
    console.log(`\nBeat ${beat.id}:`);

    // 1. Generate audio — per-beat voice override (e.g. Linh for VI beats), else reel default
    const beatVoice = beat.voice || VOICE;
    const audioPath = path.join(reelTmp, `${beat.id}.m4a`);
    await sayText(beat.narration, audioPath, beatVoice);
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

    // 4. Build beat clip — vfMode from reel config (fill_crop=CTO, letterbox=CEO)
    const clipPath = path.join(reelTmp, `${beat.id}.mp4`);
    const timing = await buildBeatClip(beat.id, subtitledFramePath, audioPath, clipPath, beatVfMode);
    clipPaths.push(clipPath);
    beatTimings.push({ narration: beat.narration, duration: timing.duration });
  }

  await browser.close();

  // 5. Write SRT to tmp (transient — not to docs/static)
  const srtPath = path.join(reelTmp, `${reelName}.srt`);
  fs.writeFileSync(srtPath, buildSRT(beatTimings));
  console.log(`\nSRT written: ${srtPath}`);

  // 6. Concatenate clips
  // CTO reel (fill_crop): use xfade crossfade (0.5s fade) between each beat for polish.
  // CEO reel (letterbox): use simple concat demuxer (unchanged behavior).
  if (beatVfMode === "fill_crop" && clipPaths.length > 1) {
    // Build a complex filtergraph with chained xfade+acrossfade between each clip pair.
    // Offset for each xfade = sum of durations so far minus 0.5s crossfade overlap.
    const XFADE_DUR = 0.5;
    const inputArgs = clipPaths.flatMap(p => ["-i", p]);
    // Build video xfade chain: [0][1]xfade → [x1]; [x1][2]xfade → [x2]; ...
    let vFilter = "";
    let aFilter = "";
    const n = clipPaths.length;
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
    // Strip trailing semicolons
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
  } else {
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
  }

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
  const ceoMp4    = path.join(OUT_DIR, "ceo-cart-quote-approval.mp4");
  const ctoMp4    = path.join(OUT_DIR, "cto-operate-observability.mp4");
  const ceoViMp4  = path.join(OUT_DIR, "ceo-cart-quote-approval-vietnamese.mp4");
  const flow11Mp4 = path.join(OUT_DIR, "invite-employee.mp4");

  // Mode flags — only the requested reel(s) are built; existing files are untouched.
  const ctoOnly    = process.argv.includes("--cto-only");
  const ceoOnly    = process.argv.includes("--ceo-only");
  const viCeoOnly  = process.argv.includes("--vi-ceo-only");
  const flow11Only = process.argv.includes("--flow11-only");

  const results = [];

  if (viCeoOnly) {
    // VI CEO reel: fill_crop mode (16:9 source, full-bleed) + xfade crossfades; Linh TTS per-beat
    console.log("\n[--vi-ceo-only] Building Vietnamese CEO reel only.");
    results.push(["CEO VI MP4", ceoViMp4, await assembleReel("ceo-vi", CEO_VI_BEATS, ceoViMp4, "fill_crop")]);
  } else if (flow11Only) {
    // Flow 11 reel: fill_crop mode (16:9 source, full-bleed) + xfade; Daniel TTS
    console.log("\n[--flow11-only] Building Flow 11 (invite-employee) reel only.");
    results.push(["Flow11 MP4", flow11Mp4, await assembleReel("flow11", FLOW11_BEATS, flow11Mp4, "fill_crop")]);
  } else if (ctoOnly) {
    // Existing CTO-only flag (protects A/A+ CEO reel)
    console.log("\n[--cto-only] Skipping CEO reel rebuild (protecting A/A+ CEO reel).");
    results.push(["CTO MP4", ctoMp4, await assembleReel("cto", CTO_BEATS, ctoMp4, "fill_crop")]);
  } else if (ceoOnly) {
    // CEO-only flag: rebuild CEO reel with SSO opening beats (RR-04b)
    console.log("\n[--ceo-only] Building CEO reel only (9 beats: SSO + 6-beat governance arc).");
    results.push(["CEO MP4", ceoMp4, await assembleReel("ceo", CEO_BEATS, ceoMp4, "letterbox")]);
  } else {
    // Default: CEO + CTO (original behavior, unchanged)
    results.push(["CEO MP4", ceoMp4, await assembleReel("ceo", CEO_BEATS, ceoMp4, "letterbox")]);
    results.push(["CTO MP4", ctoMp4, await assembleReel("cto", CTO_BEATS, ctoMp4, "fill_crop")]);
  }

  console.log("\n=== Assembly complete ===");
  for (const [label, , r] of results) {
    console.log(`${label}: ${r.mp4}`);
    console.log(`${label.replace("MP4","M4A")}: ${r.m4a}`);
  }

  // ffprobe verification for each built reel
  for (const [label, fpath] of results.map(([l, p]) => [l, p])) {
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
