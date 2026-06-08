#!/usr/bin/env node
/**
 * Capture beat 6 — post-approval state (approved status shown on approvals list)
 * Saves to docs/static/img/demo/flows/02-approval/ (permanent source, not build output)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
// Save to docs/static (permanent) AND tmp (backup)
const OUT_STATIC = path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval");
const OUT_TMP = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/02-approval");

fs.mkdirSync(OUT_STATIC, { recursive: true });
fs.mkdirSync(OUT_TMP, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${BACKEND_URL}/app/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.locator('input').first().fill("admin@test.local");
  await page.locator('input[type="password"]').fill("Test1234!");
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.goto(`${BACKEND_URL}/app/approvals`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const content = await page.textContent("body");
  const hasApproved = content.includes("Approved");
  const has2469 = content.includes("2469");
  console.log(`Approved visible: ${hasApproved}, #2469: ${has2469}`);

  const staticPath = path.join(OUT_STATIC, "step-06b-approved-audit.png");
  const tmpPath = path.join(OUT_TMP, "step-06b-approved-audit.png");
  await page.screenshot({ path: staticPath });
  await page.screenshot({ path: tmpPath });
  console.log(`Saved to: ${staticPath}`);
  console.log(`Saved to: ${tmpPath}`);

  // Also save beat5 frame (pending state frame = step-01 from prior session) to static
  const step01TmpPath = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/02-approval/step-01.png");
  if (fs.existsSync(step01TmpPath)) {
    const beat5StaticPath = path.join(OUT_STATIC, "step-05b-govern-approve.png");
    fs.copyFileSync(step01TmpPath, beat5StaticPath);
    console.log(`Copied beat5 from tmp to static: ${beat5StaticPath}`);
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
