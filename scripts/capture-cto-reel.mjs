#!/usr/bin/env node
/**
 * Capture CTO reel observability frames (beats 1, 3, 4, 5)
 * Beat 1: Stack UP / health context (terminal-style output saved as text + screenshot)
 * Beat 3: Prometheus /targets — 4/4 UP
 * Beat 4: Grafana commerce dashboard — latency + request rate panels populated
 * Beat 5: Grafana up-status grid — 4/4 green (expand row 104)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9090";
const GRAFANA_URL = process.env.GRAFANA_URL || "http://localhost:3000";
const OUT_OBS = path.join(REPO_ROOT, "docs/site/img/demo/flows/observability");
const TMP_OBS = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/observability");

fs.mkdirSync(OUT_OBS, { recursive: true });
fs.mkdirSync(TMP_OBS, { recursive: true });

async function verifyPromQL(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  const results = data.data?.result || [];
  const value = results[0]?.value?.[1];
  return { results, value };
}

async function main() {
  // Pre-capture verification
  console.log("=== Pre-capture PromQL verification ===");

  const rateCheck = await verifyPromQL("sum(rate(medusa_http_requests_total[5m]))");
  console.log(`Request rate: ${rateCheck.value}`);
  if (!rateCheck.value || parseFloat(rateCheck.value) === 0) {
    console.error("ABORT: Request rate is 0/empty. Run generate-traffic.mjs first.");
    process.exit(1);
  }

  const p95Check = await verifyPromQL("histogram_quantile(0.95,sum(rate(medusa_http_request_duration_seconds_bucket[5m]))by(le))");
  console.log(`p95 latency: ${p95Check.value}`);

  const upCheck = await verifyPromQL("up");
  const upCount = upCheck.results.filter(r => r.value?.[1] === "1").length;
  console.log(`Targets UP: ${upCount}/4`);
  if (upCount < 4) {
    console.error(`ABORT: Only ${upCount}/4 targets UP. Check observability stack.`);
    process.exit(1);
  }

  console.log("=== All pre-capture assertions PASS — launching Playwright ===");

  const browser = await chromium.launch({ headless: true });

  // === BEAT 3: Prometheus /targets ===
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(`${PROMETHEUS_URL}/targets`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const content = await page.textContent("body");
    const upCount = (content.match(/\bup\b/gi) || []).length;
    console.log(`Beat 3: Prometheus targets page, 'up' occurrences: ${upCount}`);

    const beat3Path = path.join(OUT_OBS, "prometheus-targets-up.png");
    await page.screenshot({ path: beat3Path, fullPage: false });
    console.log(`Beat 3 captured: ${beat3Path}`);
    await ctx.close();
  }

  // === BEAT 4: Grafana latency + request rate panels ===
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const grafanaUrl = `${GRAFANA_URL}/d/commerce-backend/digital-commerce-backend?from=now-1h&to=now&refresh=30s`;
    await page.goto(grafanaUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);  // Wait for panels to render

    // Verify panels have data by checking DOM for "No data" absence
    const content = await page.textContent("body");
    const hasNoData = content.includes("No data");
    const hasLatency = content.includes("Latency") || content.includes("latency") || content.includes("p50") || content.includes("p95");
    console.log(`Beat 4: Has 'No data' text: ${hasNoData}, Has latency content: ${hasLatency}`);

    const beat4Path = path.join(OUT_OBS, "grafana-latency-rate-panels.png");
    await page.screenshot({ path: beat4Path, fullPage: false });
    console.log(`Beat 4 captured: ${beat4Path}`);
    await ctx.close();
  }

  // === BEAT 5: Grafana up-status grid using panel solo URL (panel id 8) ===
  {
    // Use Grafana's d-solo endpoint to capture just the Up-Status stat panel (id=8)
    // This avoids the collapsed row issue entirely
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 400 } });
    const page = await ctx.newPage();
    // d-solo renders a single panel
    const panelSoloUrl = `${GRAFANA_URL}/d-solo/commerce-backend/digital-commerce-backend?orgId=1&from=now-1h&to=now&panelId=8`;
    await page.goto(panelSoloUrl);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    const content = await page.textContent("body");
    const hasUp = content.includes("UP") || content.includes("Up") || content.includes("up");
    console.log("Beat 5 (panel solo): Has UP text:", hasUp);
    console.log("Beat 5 page snippet:", content.slice(0, 300));

    const beat5Path = path.join(OUT_OBS, "grafana-upstatus-grid.png");
    await page.screenshot({ path: beat5Path, fullPage: false });
    console.log(`Beat 5 captured: ${beat5Path}`);
    await ctx.close();
  }

  await browser.close();
  console.log("=== CTO reel capture complete ===");
  console.log("Output frames:");
  console.log(`  ${path.join(OUT_OBS, "prometheus-targets-up.png")}`);
  console.log(`  ${path.join(OUT_OBS, "grafana-latency-rate-panels.png")}`);
  console.log(`  ${path.join(OUT_OBS, "grafana-upstatus-grid.png")}`);
}

main().catch(e => { console.error(e); process.exit(1); });
