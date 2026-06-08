#!/usr/bin/env node
/**
 * Capture CEO reel beats 1-4 fresh from the live stack.
 * Saves to docs/static/img/demo/flows/ (permanent source).
 *
 * Beat 1: Storefront cart with NZ$4,746 / 3 items / spending-limit warning / Request Quote CTA
 * Beat 2: "Submit request for quote" modal open
 * Beat 3: Buyer account Quotes list — Pending Merchant / NZ$1,582
 * Beat 4: Admin Approvals list — #2469 Demo Corp Approved (or create new pending)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";

const OUT_CART = path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote");
const OUT_APPROVAL = path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval");
const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows");

fs.mkdirSync(OUT_CART, { recursive: true });
fs.mkdirSync(OUT_APPROVAL, { recursive: true });
fs.mkdirSync(path.join(TMP_DIR, "01-cart-to-quote"), { recursive: true });
fs.mkdirSync(path.join(TMP_DIR, "02-approval"), { recursive: true });

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

async function getBuyerToken() {
  const res = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo-buyer@democorp.local", password: "Test1234!" }),
  });
  if (!res.ok) throw new Error(`Buyer login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function getPublishableKey(adminToken) {
  const res = await fetch(`${BACKEND_URL}/admin/api-keys?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();
  const key = (data.api_keys || []).find(k => k.type === "publishable" && !k.revoked_at);
  return key?.token || "";
}

function saveFrame(buf, outDir, filename) {
  const fp = path.join(outDir, filename);
  fs.writeFileSync(fp, buf);
  // Also save to tmp
  const tmpFp = path.join(TMP_DIR, outDir.includes("01-cart") ? "01-cart-to-quote" : "02-approval", filename);
  fs.writeFileSync(tmpFp, buf);
  return fp;
}

async function main() {
  const adminToken = await getAdminToken();
  const pubKey = await getPublishableKey(adminToken);
  console.log(`Pub key: ${pubKey.slice(0, 20)}...`);

  // Get NZ region
  const regRes = await fetch(`${BACKEND_URL}/store/regions`, {
    headers: { "x-publishable-api-key": pubKey },
  });
  const regData = await regRes.json();
  const nzRegion = (regData.regions || []).find(r => r.currency_code === "nzd");
  if (!nzRegion) throw new Error("No NZD region found");
  console.log(`NZ region: ${nzRegion.id}`);

  const browser = await chromium.launch({ headless: true });

  // ==========================================================================
  // STOREFRONT: login as buyer and navigate to cart
  // ==========================================================================
  const storefront = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const sfPage = await storefront.newPage();

  // Navigate to storefront
  await sfPage.goto(`${STOREFRONT_URL}/nz`);
  await sfPage.waitForLoadState("networkidle");
  await sfPage.waitForTimeout(2000);

  // Login to storefront (find the account login link)
  // First check if there's a login link
  const loginLink = sfPage.locator('a[href*="login"], a[href*="account"]').first();
  const hasLogin = await loginLink.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasLogin) {
    await loginLink.click();
    await sfPage.waitForLoadState("networkidle");
    await sfPage.waitForTimeout(1000);
  } else {
    await sfPage.goto(`${STOREFRONT_URL}/nz/account`);
    await sfPage.waitForLoadState("networkidle");
  }

  // Check if we need to log in
  const sfContent = await sfPage.textContent("body");
  if (sfContent.includes("Sign in") || sfContent.includes("Email") || sfContent.includes("email")) {
    // Fill login form
    const emailInput = sfPage.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill("demo-buyer@democorp.local");
      const passInput = sfPage.locator('input[type="password"]').first();
      await passInput.fill("Test1234!");
      await sfPage.locator('button[type="submit"]').first().click();
      await sfPage.waitForLoadState("networkidle");
      await sfPage.waitForTimeout(2000);
    }
  }

  // Navigate to cart
  await sfPage.goto(`${STOREFRONT_URL}/nz/cart`);
  await sfPage.waitForLoadState("networkidle");
  await sfPage.waitForTimeout(2000);

  const cartContent = await sfPage.textContent("body");
  const hasCartItems = cartContent.includes("NZ$") || cartContent.includes("item");
  const has4746 = cartContent.includes("4,746") || cartContent.includes("4746");
  console.log(`Cart page — has NZ$: ${cartContent.includes("NZ$")}, has 4,746: ${has4746}`);

  // === BEAT 1: Cart with items, spending limit warning ===
  if (has4746 && hasCartItems) {
    const buf1 = await sfPage.screenshot();
    const p1 = saveFrame(buf1, OUT_CART, "step-01.png");
    console.log(`Beat 1 captured: ${p1}`);
  } else {
    console.log("WARN: Cart may not have 3 items / NZ$4,746 — capturing as-is");
    const buf1 = await sfPage.screenshot();
    const p1 = saveFrame(buf1, OUT_CART, "step-01.png");
    console.log(`Beat 1 captured (fallback): ${p1}`);
  }

  // === BEAT 2: Open the "Submit request for quote" modal ===
  // Click Request Quote button
  const requestQuoteBtn = sfPage.locator('text=Request Quote, button:has-text("Request Quote"), [data-testid*="quote"]').first();
  const hasQuoteBtn = await requestQuoteBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasQuoteBtn) {
    await requestQuoteBtn.click();
    await sfPage.waitForTimeout(1000);
    const modalContent = await sfPage.textContent("body");
    const hasModal = modalContent.includes("Submit request") || modalContent.includes("request for quote");
    console.log(`Beat 2: modal visible: ${hasModal}`);
    const buf2 = await sfPage.screenshot();
    const p2 = saveFrame(buf2, OUT_CART, "step-04.png");
    console.log(`Beat 2 captured: ${p2}`);
    // Close modal
    const cancelBtn = sfPage.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await sfPage.waitForTimeout(500);
    }
  } else {
    console.log("WARN: Request Quote button not found, capturing cart as beat2 fallback");
    const buf2 = await sfPage.screenshot();
    const p2 = saveFrame(buf2, OUT_CART, "step-04.png");
    console.log(`Beat 2 fallback: ${p2}`);
  }

  // === BEAT 3: Buyer's Quotes list ===
  await sfPage.goto(`${STOREFRONT_URL}/nz/account/quotes`);
  await sfPage.waitForLoadState("networkidle");
  await sfPage.waitForTimeout(2000);
  const quotesContent = await sfPage.textContent("body");
  const hasPendingMerchant = quotesContent.includes("Pending Merchant");
  const has1582 = quotesContent.includes("1,582") || quotesContent.includes("1582");
  console.log(`Beat 3 — Pending Merchant: ${hasPendingMerchant}, NZ$1,582: ${has1582}`);
  const buf3 = await sfPage.screenshot();
  const p3 = saveFrame(buf3, OUT_CART, "step-05.png");
  console.log(`Beat 3 captured: ${p3}`);

  await storefront.close();

  // ==========================================================================
  // ADMIN: Approvals list
  // ==========================================================================
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const adminPage = await adminCtx.newPage();

  // Login to admin
  await adminPage.goto(`${BACKEND_URL}/app/login`);
  await adminPage.waitForLoadState("networkidle");
  await adminPage.waitForTimeout(1500);
  await adminPage.locator('input').first().fill("admin@test.local");
  await adminPage.locator('input[type="password"]').fill("Test1234!");
  await adminPage.locator('button[type="submit"]').click();
  await adminPage.waitForLoadState("networkidle");
  await adminPage.waitForTimeout(2000);

  // === BEAT 4: Admin approvals list ===
  await adminPage.goto(`${BACKEND_URL}/app/approvals`);
  await adminPage.waitForLoadState("networkidle");
  await adminPage.waitForTimeout(2000);

  const approvalContent = await adminPage.textContent("body");
  const has2469 = approvalContent.includes("2469");
  const hasDemoCorp = approvalContent.includes("Demo Corp");
  console.log(`Beat 4 — #2469: ${has2469}, Demo Corp: ${hasDemoCorp}`);

  const buf4 = await adminPage.screenshot();
  const p4 = saveFrame(buf4, OUT_APPROVAL, "step-01.png");
  console.log(`Beat 4 captured: ${p4}`);

  await adminCtx.close();
  await browser.close();

  console.log("\n=== CEO beats 1-4 capture complete ===");
  console.log(`Frames saved to: ${OUT_CART} and ${OUT_APPROVAL}`);
}

main().catch(e => { console.error(e); process.exit(1); });
