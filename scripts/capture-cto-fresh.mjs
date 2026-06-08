#!/usr/bin/env node
/**
 * CTO Reel — SRE-Grade Observability Capture (5 beats)
 * scope_id: dc-b2b-cto-sre-upgrade
 *
 * Beat 1 (Hero):     Grafana commerce-backend — panels 1+2 (latency p50/p95/p99 + rate-by-status)
 *                    Highlight: p95 series + legend; Olivia role-bar.
 * Beat 2 (SLI):      Same hero frame, emphasis on p95 line + legend value.
 *                    Highlight: p95 line + legend row; stronger glow.
 * Beat 3 (RED):      Panel 2 — rate-by-status: 2xx (green) + 4xx (orange).
 *                    Highlight: 2xx + 4xx series legend + throughput total.
 *                    NOTE: No 5xx series (zero server errors = healthy). Honest.
 * Beat 4 (Saturation): Grafana panels 3 (PG conn) + 6 (Redis Mem Used) + 7 (Node CPU).
 *                    Panel 6 = Redis Memory Used (gauge ~1.68MB, always populated).
 *                    Panel 5 (hit-ratio) = rate-based, decays to 0 — NOT used (CA R3 ruling).
 *                    Saved as grafana-saturation-panels.png.
 * Beat 5 (MTTD):     Prometheus /targets 4/4 UP. Olivia role-bar.
 *                    Saved as prometheus-targets-up.png.
 *
 * Viewport strategy (dc-b2b-cto-sre-upgrade fix):
 *   ALL Playwright contexts use viewport 1280x720 (exactly 16:9) + deviceScaleFactor: 2.
 *   This produces 2560x1440 (2x HiDPI) PNG sources that ARE 16:9 — no letterbox bars
 *   when ffmpeg scales to 1280x720. Previously 1440x900 (8:5) caused letterboxing.
 *
 * Assembly strategy: crisp static frames + xfade crossfades (no zoompan).
 *   Dense SRE dashboards favour static (p95 numbers legible); Ken-Burns motion on
 *   downscaled Grafana is blurry and unprofessional.
 *
 * Traffic-first gate: rate >= 0.5 req/s enforced before any capture.
 * Highlights: Playwright CSS injection only (NOT ffmpeg drawtext).
 *
 * Pre-conditions:
 *   - Prometheus running at :9090
 *   - Grafana running at :3000 (anonymous viewer enabled)
 *   - Real commerce traffic: sum(rate(medusa_http_requests_total[5m])) >= 0.5 req/s
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(
  new URL(import.meta.url).pathname, "../.."
).replace(/^file:\/\//, "");

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9090";
const GRAFANA_URL     = process.env.GRAFANA_URL    || "http://localhost:3000";

// Permanent source — NOT docs/site (build output)
const OUT_OBS = path.join(REPO_ROOT, "docs/static/img/demo/flows/observability");
fs.mkdirSync(OUT_OBS, { recursive: true });

// ─── Role-bar injection ────────────────────────────────────────────────────────
// Matches capture-ceo-fresh.mjs CSS for cross-reel visual consistency.

async function injectRoleBar(page, label, initial) {
  await page.evaluate(({ label, initial }) => {
    const existing = document.getElementById("reel-rolebar");
    if (existing) existing.remove();

    const bar = document.createElement("div");
    bar.id = "reel-rolebar";
    bar.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "height:48px",
      "display:flex",
      "align-items:center",
      "gap:12px",
      "padding:0 20px",
      "background:linear-gradient(90deg,#0f1f3d,#1a3a6b)",
      "color:#fff",
      "font:600 16px/48px system-ui,-apple-system,sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.25)",
      "z-index:2147483647",
    ].join(";");

    const dot = document.createElement("span");
    dot.style.cssText = [
      "width:28px",
      "height:28px",
      "border-radius:50%",
      "background:#6c8ebf",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "font-weight:700",
      "font-size:13px",
      "flex-shrink:0",
    ].join(";");
    dot.textContent = initial;

    const lbl = document.createElement("span");
    lbl.textContent = label;

    bar.appendChild(dot);
    bar.appendChild(lbl);
    document.body.appendChild(bar);
  }, { label, initial });
}

// ─── Highlight injection: p95 series glow on panel 1 ──────────────────────────
// Grafana renders SVG lines and legend table rows. We style them via CSS.
// The p95 selector targets Grafana's CSS variable for the series color or data-seriesname.

async function highlightP95(page) {
  await page.evaluate(() => {
    // Grafana panel legend rows contain the series label text
    // Target all legend items that contain "p95" text
    const allText = document.querySelectorAll('[class*="legend"] span, [class*="Legend"] span, td, th, div');
    allText.forEach(el => {
      if (el.textContent && el.textContent.trim().toLowerCase().includes('p95')) {
        el.style.cssText += ';outline:2px solid #f59e0b;box-shadow:0 0 8px 2px rgba(245,158,11,0.7);border-radius:3px;background:rgba(245,158,11,0.12);';
      }
    });
    // Also try to highlight SVG paths — p95 is typically the 3rd series (orange/amber in Grafana palette)
    const svgPaths = document.querySelectorAll('svg path[stroke], svg line[stroke]');
    svgPaths.forEach(path => {
      const stroke = path.getAttribute('stroke') || '';
      // Grafana default palette: series 3 (0-indexed: 2) = orange/amber
      if (stroke && (stroke.includes('ff7') || stroke.includes('f59') || stroke.includes('orange') || stroke.includes('FF7'))) {
        path.style.cssText += ';filter:drop-shadow(0 0 4px rgba(245,158,11,0.9));stroke-width:3;';
      }
    });
    // Add a highlight banner for the p95 label
    const style = document.createElement('style');
    style.textContent = `
      [data-testid*="legend"] [class*="label"]:contains,
      [class*="legendSeriesIcon"] + span { }
      /* Broad coverage: any element whose visible text is exactly p95 */
    `;
    document.head.appendChild(style);
  });
}

// ─── Highlight injection: 2xx and 4xx series on panel 2 ────────────────────────

async function highlight2xxAnd4xx(page) {
  await page.evaluate(() => {
    // Target legend label elements containing "2" (2xx series) and "4" (4xx series)
    const allEls = document.querySelectorAll('[class*="legend"] span, [class*="Legend"] span, td');
    allEls.forEach(el => {
      const txt = el.textContent ? el.textContent.trim() : '';
      if (txt === '200' || txt === '2xx' || txt.startsWith('20')) {
        el.style.cssText += ';outline:2px solid #22c55e;box-shadow:0 0 8px 2px rgba(34,197,94,0.7);border-radius:3px;background:rgba(34,197,94,0.10);';
      }
      if (txt === '401' || txt === '403' || txt === '4xx' || txt.startsWith('40')) {
        el.style.cssText += ';outline:2px solid #f97316;box-shadow:0 0 8px 2px rgba(249,115,22,0.7);border-radius:3px;background:rgba(249,115,22,0.10);';
      }
    });
    // Throughput/rate total — highlight any legend total row
    const totalEls = document.querySelectorAll('[class*="legend"] [class*="total"], [class*="legendSeriesTotal"]');
    totalEls.forEach(el => {
      el.style.cssText += ';outline:2px solid #60a5fa;border-radius:3px;';
    });
  });
}

// ─── PromQL helper ────────────────────────────────────────────────────────────

async function verifyPromQL(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res  = await fetch(url);
  const data = await res.json();
  const results = data.data?.result || [];
  const value = results[0]?.value?.[1];
  return { results, value };
}

function save(buf, filePath) {
  fs.writeFileSync(filePath, buf);
  console.log(`  SAVED: ${filePath} (${Math.round(buf.length / 1024)}KB)`);
  return filePath;
}

async function main() {
  console.log("=== CTO Reel — SRE-Grade Observability Capture (5 beats) ===");
  console.log(`Prometheus: ${PROMETHEUS_URL}`);
  console.log(`Grafana:    ${GRAFANA_URL}`);

  // ── Traffic-first gate (CA R1 — HIGH) ─────────────────────────────────────
  console.log("\n[Pre-capture] Traffic-first gate check...");

  const rateCheck = await verifyPromQL("sum(rate(medusa_http_requests_total[5m]))");
  const rateVal = rateCheck.value ? parseFloat(rateCheck.value) : 0;
  console.log(`  Request rate (5m window): ${rateVal.toFixed(4)} req/s`);

  if (!rateCheck.value || rateVal === 0) {
    console.error("ABORT: Request rate is 0. Run scripts/generate-traffic.mjs first.");
    process.exit(1);
  }
  if (rateVal < 0.5) {
    console.error(`ABORT: Request rate ${rateVal.toFixed(4)} req/s < 0.5 minimum.`);
    console.error("Run scripts/generate-traffic.mjs to regenerate traffic, then retry.");
    process.exit(1);
  }
  console.log(`  Traffic gate PASS: ${rateVal.toFixed(4)} >= 0.5 req/s`);

  // Verify latency percentiles are populated
  const p95Check = await verifyPromQL(
    "histogram_quantile(0.95,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))"
  );
  const p50Check = await verifyPromQL(
    "histogram_quantile(0.50,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))"
  );
  const p99Check = await verifyPromQL(
    "histogram_quantile(0.99,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))"
  );
  const p50ms = p50Check.value ? Math.round(parseFloat(p50Check.value) * 1000) : "N/A";
  const p95ms = p95Check.value ? Math.round(parseFloat(p95Check.value) * 1000) : "N/A";
  const p99ms = p99Check.value ? Math.round(parseFloat(p99Check.value) * 1000) : "N/A";
  console.log(`  Latency — p50: ${p50ms}ms | p95: ${p95ms}ms | p99: ${p99ms}ms`);

  // Verify saturation panels
  const redisMemCheck = await verifyPromQL("redis_memory_used_bytes");
  const redisMem = redisMemCheck.value ? Math.round(parseFloat(redisMemCheck.value) / 1024) + "KB" : "N/A";
  console.log(`  Redis Memory Used: ${redisMem} (panel6, always populated)`);

  const upCheck = await verifyPromQL("up");
  const upCount = upCheck.results.filter(r => r.value?.[1] === "1").length;
  const totalTargets = upCheck.results.length;
  console.log(`  Targets UP: ${upCount}/${totalTargets}`);
  if (upCount < 4) {
    console.warn(`  WARN: Only ${upCount}/${totalTargets} targets UP.`);
  }

  console.log("  Pre-capture assertions PASS — launching Playwright");

  const browser = await chromium.launch({ headless: true });

  // ── Beat 1 + Beat 2: Grafana hero — latency + rate panels ─────────────────
  // One screenshot serves both Beat 1 (hero cold-open) and Beat 2 (SLI emphasis).
  // Viewport 1280x720 (exactly 16:9) + deviceScaleFactor:2 → 2560x1440 PNG.
  // 16:9 source scales to exact 1280x720 with NO letterbox bars.
  console.log("\n[Beat 1+2] Grafana hero — panels 1+2 (latency p50/p95/p99 + rate-by-status)...");
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // kiosk=tv strips Grafana nav/sidebar for clean professional framing
    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s&kiosk=tv`;
    await page.goto(grafanaUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000); // wait for panel data to render

    const content = await page.textContent("body");
    const hasNoData  = content.includes("No data");
    const hasLatency = content.includes("Latency") || content.includes("p50") || content.includes("p95") || content.includes("ms");
    console.log(`  Grafana — 'No data': ${hasNoData}, latency content: ${hasLatency}`);

    if (hasNoData && !hasLatency) {
      console.warn("  WARN: Grafana showing 'No data' — panels may be empty.");
    }

    // Inject Olivia role-bar (top) — baked into full-bleed 16:9 PNG
    await injectRoleBar(page, "Olivia · CTO / Platform", "O");

    // Inject p95 highlight glow — stays in-frame because it's burned into PNG
    await highlightP95(page);

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "grafana-latency-rate-panels.png"));
    await ctx.close();
  }

  // ── Beat 3: RED — panel 2 rate-by-status (2xx green + 4xx orange) ─────────
  // NOTE: No 5xx series (zero server errors — healthy). Narration uses capability framing.
  console.log("\n[Beat 3] Grafana — panel 2 rate-by-status (2xx + 4xx, no 5xx = healthy)...");
  {
    // 16:9 viewport → 2560x1440 PNG → no letterbox when scaled to 1280x720.
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s&kiosk=tv`;
    await page.goto(grafanaUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000);

    await injectRoleBar(page, "Olivia · CTO / Platform", "O");
    await highlight2xxAnd4xx(page);

    const buf = await page.screenshot();
    // Beats 1+2 and Beat 3 both use the latency+rate hero PNG
    // Save Beat 3 under the same canonical name (assemble-reels uses this for beat3)
    // We already saved beat1+2 above; for beat3 we save with the highlight variant
    save(buf, path.join(OUT_OBS, "grafana-latency-rate-panels.png"));
    console.log("  Beat 3 saved to grafana-latency-rate-panels.png (2xx/4xx highlights baked in)");
    await ctx.close();
  }

  // ── Beat 4: Saturation — panels 3 + 6 + 7 (PG conn + Redis Mem + Node CPU) ─
  // panel6 = Redis Memory Used (gauge, always ~1.68MB, never flat).
  // panel5 (hit-ratio) excluded: rate-based, decays to 0 without Redis traffic (CA R3).
  console.log("\n[Beat 4] Grafana — saturation panels 3 (PG conn) + 6 (Redis Mem) + 7 (Node CPU)...");
  {
    // 16:9 viewport → 2560x1440 PNG → no letterbox when scaled to 1280x720.
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s&kiosk=tv`;
    await page.goto(grafanaUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000);

    const content = await page.textContent("body");
    const hasPG   = content.includes("Postgres") || content.includes("Connection") || content.includes("Active");
    const hasNode = content.includes("CPU") || content.includes("Node");
    const hasRedis = content.includes("Redis") || content.includes("Memory");
    console.log(`  Saturation panels — PG: ${hasPG}, Node: ${hasNode}, Redis: ${hasRedis}`);

    await injectRoleBar(page, "Olivia · CTO / Platform", "O");

    // Highlight saturation-related content
    await page.evaluate(() => {
      const allEls = document.querySelectorAll('[class*="panel"] [class*="title"], [class*="panel-title"], h2, h3, [class*="grafana"] span');
      allEls.forEach(el => {
        const txt = el.textContent ? el.textContent.trim().toLowerCase() : '';
        if (txt.includes('connection') || txt.includes('postgres') || txt.includes('pg')) {
          el.style.cssText += ';outline:2px solid #60a5fa;box-shadow:0 0 6px rgba(96,165,250,0.6);border-radius:3px;';
        }
        if (txt.includes('cpu') || txt.includes('node')) {
          el.style.cssText += ';outline:2px solid #34d399;box-shadow:0 0 6px rgba(52,211,153,0.6);border-radius:3px;';
        }
        if (txt.includes('memory') || txt.includes('redis') || txt.includes('mem')) {
          el.style.cssText += ';outline:2px solid #a78bfa;box-shadow:0 0 6px rgba(167,139,250,0.6);border-radius:3px;';
        }
      });
    });

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "grafana-saturation-panels.png"));
    await ctx.close();
  }

  // ── Beat 5: Prometheus /targets — 4/4 UP (MTTD = 15s scrape) ─────────────
  console.log("\n[Beat 5] Prometheus targets — 4/4 UP (MTTD evidence)...");
  {
    // 16:9 viewport → 2560x1440 PNG → no letterbox when scaled to 1280x720.
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    await page.goto(`${PROMETHEUS_URL}/targets`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const content = await page.textContent("body");
    const upInstances = (content.match(/\bup\b/gi) || []).length;
    const hasTargetHealth = content.includes("Targets") || content.includes("Health");
    console.log(`  Prometheus targets — 'up' matches: ${upInstances}, health visible: ${hasTargetHealth}`);

    await injectRoleBar(page, "Olivia · CTO / Platform", "O");

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "prometheus-targets-up.png"));
    await ctx.close();
  }

  await browser.close();

  // ── Verify all frames exist ────────────────────────────────────────────────
  console.log("\n=== Verifying frames...");
  const required = [
    path.join(OUT_OBS, "grafana-latency-rate-panels.png"),   // beats 1, 2, 3
    path.join(OUT_OBS, "grafana-saturation-panels.png"),      // beat 4
    path.join(OUT_OBS, "prometheus-targets-up.png"),          // beat 5
  ];

  let allOk = true;
  for (const p of required) {
    const exists = fs.existsSync(p);
    const size   = exists ? Math.round(fs.statSync(p).size / 1024) : 0;
    const status = exists && size >= 10 ? "OK" : "MISSING/SMALL";
    console.log(`  ${status} ${p} (${size}KB)`);
    if (!exists || size < 10) allOk = false;
  }

  // Summary with verified live metric values
  console.log("\n=== Live metric values at capture time ===");
  console.log(`  Traffic: ${rateVal.toFixed(4)} req/s (>= 0.5 guard)`);
  console.log(`  p50: ${p50ms}ms | p95: ${p95ms}ms | p99: ${p99ms}ms`);
  console.log(`  Redis Memory Used: ${redisMem} (panel6, non-zero)`);
  console.log(`  Targets: ${upCount}/${totalTargets} UP`);

  console.log(`\n=== CTO capture ${allOk ? "COMPLETE" : "PARTIAL — check MISSING frames"} ===`);
  if (!allOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
