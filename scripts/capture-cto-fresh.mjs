#!/usr/bin/env node
/**
 * CTO Reel — Fresh Observability Capture (beats 3, 4)
 *
 * Saves ALL frames to docs/static/img/demo/flows/observability/ (permanent source).
 * Beats are numbered per reel-cto-narration.md:
 *   Beat 3: Prometheus /targets — all 4 targets UP (with Olivia role-bar)
 *   Beat 4: Grafana — latency + request rate panels populated (kiosk=tv, retina, Olivia role-bar)
 *
 * REMOVED: Beat 5 (panelId=8 grafana-upstatus-grid) — the 4xUP grid was the junior-UX tile
 *          that HITL rejected. Health shown via the full rich dashboard (panels 1+2) only.
 *
 * Pre-conditions:
 *   - Prometheus running at :9090
 *   - Grafana running at :3000 (anonymous viewer enabled)
 *   - Real commerce traffic generated: sum(rate(medusa_http_requests_total[5m])) >= 0.5 req/s
 *     (run scripts/generate-traffic.mjs first)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(
  new URL(import.meta.url).pathname, "../.."
).replace(/^file:\/\//, "");

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9090";
const GRAFANA_URL     = process.env.GRAFANA_URL    || "http://localhost:3000";

// Always save to docs/static (permanent source — NOT docs/site which is build output)
const OUT_OBS = path.join(REPO_ROOT, "docs/static/img/demo/flows/observability");
fs.mkdirSync(OUT_OBS, { recursive: true });

// ─── Role-bar injection helper ───────────────────────────────────────────────
// Identical CSS to capture-ceo-fresh.mjs for visual consistency (CTO-AC-3 / CEO-AC-7)

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
  console.log("=== CTO Reel — Fresh Observability Capture ===");
  console.log(`Prometheus: ${PROMETHEUS_URL}`);
  console.log(`Grafana:    ${GRAFANA_URL}`);

  // ── Pre-capture PromQL assertions ─────────────────────────────────────────
  console.log("\n[1/3] Pre-capture PromQL verification...");

  const rateCheck = await verifyPromQL("sum(rate(medusa_http_requests_total[5m]))");
  const rateVal = rateCheck.value ? parseFloat(rateCheck.value) : 0;
  console.log(`  Request rate (5m window): ${rateCheck.value || "N/A"} req/s`);

  // Raised guard: require >= 0.5 req/s for a populated hero (not just > 0)
  if (!rateCheck.value || rateVal === 0) {
    console.error("ABORT: Request rate is 0. Run scripts/generate-traffic.mjs first.");
    process.exit(1);
  }
  if (rateVal < 0.5) {
    console.error(`ABORT: Request rate ${rateVal.toFixed(4)} req/s < 0.5 minimum for A-grade hero panels.`);
    console.error("Run scripts/generate-traffic.mjs to regenerate traffic, then retry.");
    process.exit(1);
  }
  console.log(`  Rate guard PASS: ${rateVal.toFixed(4)} >= 0.5 req/s`);

  const p95Check = await verifyPromQL(
    "histogram_quantile(0.95,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))"
  );
  const p95ms = p95Check.value ? Math.round(parseFloat(p95Check.value) * 1000) : "N/A";
  console.log(`  p95 latency: ${p95ms}ms`);

  const upCheck = await verifyPromQL("up");
  const upCount = upCheck.results.filter(r => r.value?.[1] === "1").length;
  const totalTargets = upCheck.results.length;
  console.log(`  Targets UP: ${upCount}/${totalTargets}`);
  if (upCount < 4) {
    console.warn(`  WARN: Only ${upCount}/${totalTargets} targets UP. Proceeding anyway (check observability stack).`);
  }

  console.log("  Pre-capture assertions PASS — launching Playwright");

  const browser = await chromium.launch({ headless: true });

  // ── Beat 3: Prometheus /targets ────────────────────────────────────────────
  console.log("\n[2/3] Beat 3 — Prometheus targets page...");
  {
    const ctx  = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    await page.goto(`${PROMETHEUS_URL}/targets`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const content = await page.textContent("body");
    const upInstances = (content.match(/\bup\b/gi) || []).length;
    const hasTargetHealth = content.includes("Targets") || content.includes("Health");
    console.log(`  Prometheus targets — 'up' matches: ${upInstances}, health visible: ${hasTargetHealth}`);

    // CTO-AC-3 / CTO-AC-6: Olivia role-bar on targets frame
    await injectRoleBar(page, "Olivia · CTO / Platform", "O");

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "prometheus-targets-up.png"));
    await ctx.close();
  }

  // ── Beat 4: Grafana hero — latency + request rate panels (kiosk=tv, retina) ─
  // CTO-AC-1: hero at 1440x900 kiosk=tv, panels 1+2 (latency p50/p95/p99 + rate by status)
  // CTO-AC-5: panels are populated (rate >= 0.5 already verified above)
  console.log("\n[3/3] Beat 4 — Grafana commerce dashboard (hero, kiosk=tv)...");
  {
    const ctx  = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // kiosk=tv strips Grafana nav/sidebar for clean professional framing
    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s&kiosk=tv`;
    await page.goto(grafanaUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000); // Extra time for panel data to render

    const content = await page.textContent("body");
    const hasNoData  = content.includes("No data");
    const hasLatency = content.includes("Latency") || content.includes("p50") || content.includes("p95") || content.includes("ms");
    console.log(`  Grafana — 'No data' visible: ${hasNoData}, latency/ms content: ${hasLatency}`);
    console.log(`  Snippet: ${content.slice(0, 200)}`);

    if (hasNoData && !hasLatency) {
      console.error("WARN: Grafana showing 'No data' — hero panels may be empty. Consider re-running generate-traffic.mjs.");
    }

    // CTO-AC-3: Olivia role-bar on hero frame
    await injectRoleBar(page, "Olivia · CTO / Platform", "O");

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "grafana-latency-rate-panels.png"));
    await ctx.close();
  }

  // NOTE: panelId=8 (grafana-upstatus-grid) capture block has been REMOVED.
  // The 4xUP giant-tile stat grid was the junior-UX that HITL rejected.
  // Health is shown via the full rich dashboard (panels 1+2 hero) only.

  await browser.close();

  // ── Verify all frames exist ────────────────────────────────────────────────
  console.log("\n=== Verifying frames...");
  const required = [
    path.join(OUT_OBS, "prometheus-targets-up.png"),
    path.join(OUT_OBS, "grafana-latency-rate-panels.png"),
    // grafana-upstatus-grid.png intentionally removed (CTO-AC-2)
  ];

  let allOk = true;
  for (const p of required) {
    const exists = fs.existsSync(p);
    const size   = exists ? Math.round(fs.statSync(p).size / 1024) : 0;
    console.log(`  ${exists ? "OK" : "MISSING"} ${p} (${size}KB)`);
    if (!exists || size < 10) allOk = false;
  }

  console.log(`\n=== CTO capture ${allOk ? "COMPLETE" : "PARTIAL — check MISSING frames"} ===`);
  if (!allOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
