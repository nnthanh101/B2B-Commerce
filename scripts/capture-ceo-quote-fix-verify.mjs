#!/usr/bin/env node
/**
 * Verify $NaN fix on Quote Summary page (admin /app/quotes/<id>)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/02-approval");

fs.mkdirSync(TMP_DIR, { recursive: true });

async function getAdminToken() {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local", password: "Test1234!" }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function login(page) {
  await page.goto(`${BACKEND_URL}/app/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Try various selectors
  const loginPageHtml = await page.content();
  console.log("Login page body snippet:", loginPageHtml.slice(0, 500));

  // Fill with flexible selectors
  const emailInput = page.locator('input').first();
  await emailInput.fill("admin@test.local");

  const passInput = page.locator('input[type="password"]');
  await passInput.fill("Test1234!");

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("After login URL:", page.url());
}

async function main() {
  const adminToken = await getAdminToken();

  const res = await fetch(`${BACKEND_URL}/admin/quotes?limit=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();
  const quote = (data.quotes || [])[0];
  if (!quote) { console.error("No quotes found"); process.exit(1); }
  console.log("Quote ID:", quote.id);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await login(page);

  await page.goto(`${BACKEND_URL}/app/quotes/${quote.id}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(4000);

  const content = await page.textContent("body");
  const hasNaN = content.includes("$NaN") || content.includes("NaN");
  const hasSpendingLimit = content.includes("Spending Limit");

  console.log("$NaN present:", hasNaN);
  console.log("Spending Limit label:", hasSpendingLimit);
  console.log("Snippet:", content.slice(0, 800));

  const outPath = path.join(TMP_DIR, "quote-detail-nan-fix-verify.png");
  await page.screenshot({ path: outPath });
  console.log("Screenshot:", outPath);

  await browser.close();

  if (hasNaN) {
    console.error("FAIL: $NaN still visible");
    process.exit(1);
  }
  console.log("PASS: $NaN not present");
}

main().catch(e => { console.error(e); process.exit(1); });
