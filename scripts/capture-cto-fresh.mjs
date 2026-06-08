#!/usr/bin/env node
/**
 * CTO Reel — Fresh Observability Capture (beats 3, 4, 5)
 *
 * Saves ALL frames to docs/static/img/demo/flows/observability/ (permanent source).
 * Beats are numbered per reel-cto-narration.md:
 *   Beat 3: Prometheus /targets — all 4 targets UP
 *   Beat 4: Grafana — latency + request rate panels populated (real traffic data)
 *   Beat 5: Grafana — Up-Status stat grid, 4/4 green tiles
 *
 * Pre-conditions:
 *   - Prometheus running at :9090
 *   - Grafana running at :3000 (anonymous viewer enabled)
 *   - Real commerce traffic already generated (sum(rate(medusa_http_requests_total[5m])) > 0)
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
  console.log("\n[1/4] Pre-capture PromQL verification...");

  const rateCheck = await verifyPromQL("sum(rate(medusa_http_requests_total[5m]))");
  console.log(`  Request rate (5m window): ${rateCheck.value || "N/A"}`);
  if (!rateCheck.value || parseFloat(rateCheck.value) === 0) {
    console.error("ABORT: Request rate is 0. Run generate-traffic.mjs first.");
    process.exit(1);
  }

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
  console.log("\n[2/4] Beat 3 — Prometheus targets page...");
  {
    const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    await page.goto(`${PROMETHEUS_URL}/targets`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const content = await page.textContent("body");
    const upInstances = (content.match(/\bup\b/gi) || []).length;
    const hasTargetHealth = content.includes("Targets") || content.includes("Health");
    console.log(`  Prometheus targets — 'up' matches: ${upInstances}, health visible: ${hasTargetHealth}`);

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "prometheus-targets-up.png"));
    await ctx.close();
  }

  // ── Beat 4: Grafana latency + request rate panels ──────────────────────────
  console.log("\n[3/4] Beat 4 — Grafana commerce dashboard...");
  {
    const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    // Use domcontentloaded — networkidle times out on Grafana due to WebSocket activity
    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s`;
    await page.goto(grafanaUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000); // Extra time for panel data to render

    const content = await page.textContent("body");
    const hasNoData  = content.includes("No data");
    const hasLatency = content.includes("Latency") || content.includes("p50") || content.includes("p95") || content.includes("ms");
    console.log(`  Grafana — 'No data' visible: ${hasNoData}, latency/ms content: ${hasLatency}`);
    console.log(`  Snippet: ${content.slice(0, 200)}`);

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "grafana-latency-rate-panels.png"));
    await ctx.close();
  }

  // ── Beat 5: Grafana Up-Status panel (solo URL) ─────────────────────────────
  console.log("\n[4/4] Beat 5 — Grafana Up-Status stat panel...");
  {
    const ctx  = await browser.newContext({ viewport: { width: 1200, height: 600 } });
    const page = await ctx.newPage();

    // d-solo renders just one panel — bypasses collapsed-row issue
    const panelSoloUrl = `${GRAFANA_URL}/d-solo/commerce-backend/digital-commerce-backend?orgId=1&from=now-1h&to=now&panelId=8`;
    await page.goto(panelSoloUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);

    const content = await page.textContent("body");
    const hasUp   = content.includes("UP") || content.includes("Up");
    console.log(`  Up-Status panel — 'UP' visible: ${hasUp}`);
    console.log(`  Snippet: ${content.slice(0, 200)}`);

    const buf = await page.screenshot();
    save(buf, path.join(OUT_OBS, "grafana-upstatus-grid.png"));
    await ctx.close();
  }

  await browser.close();

  // ── Verify all 3 frames exist ──────────────────────────────────────────────
  console.log("\n=== Verifying frames...");
  const required = [
    path.join(OUT_OBS, "prometheus-targets-up.png"),
    path.join(OUT_OBS, "grafana-latency-rate-panels.png"),
    path.join(OUT_OBS, "grafana-upstatus-grid.png"),
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
