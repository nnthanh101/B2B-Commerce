#!/usr/bin/env node
/**
 * CEO Reel — Full Fresh Capture (all 6 beats)
 *
 * Saves ALL frames to docs/static/img/demo/flows/ (permanent source, not build output).
 *
 * Pre-conditions:
 *   - Stack running: ec_backend (9000), ec_storefront (8000)
 *   - approval appr_01KTJPADHRQ6457KFCTF1JZ1VX in PENDING state (reset before run)
 *
 * Beat 1: Storefront cart — 3 items, NZD total > spending limit, spending-limit warning visible
 * Beat 2: "Submit request for quote" modal open
 * Beat 3: Buyer account Quotes list — status "Pending Merchant"
 * Beat 4: Admin Approvals list — Demo Corp pending
 * Beat 5: Admin Approvals — same view (govern-approve frame for narration)
 * Beat 6: After approve API call, Approvals list shows Approved state
 *
 * Evidence paths:
 *   docs/static/img/demo/flows/01-cart-to-quote/step-01.png  (beat1: cart)
 *   docs/static/img/demo/flows/01-cart-to-quote/step-04.png  (beat2: quote modal)
 *   docs/static/img/demo/flows/01-cart-to-quote/step-05.png  (beat3: quotes list)
 *   docs/static/img/demo/flows/02-approval/step-01.png       (beat4: admin approvals pending)
 *   docs/static/img/demo/flows/02-approval/step-05b-govern-approve.png (beat5: govern view)
 *   docs/static/img/demo/flows/02-approval/step-06b-approved-audit.png (beat6: approved)
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import pgModule from "/Volumes/Working/projects/B2B-Commerce/node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/index.js";
const pg = pgModule.default || pgModule["module.exports"] || pgModule;

const REPO_ROOT = path.resolve(
  new URL(import.meta.url).pathname, "../.."
).replace(/^file:\/\//, "");

const BACKEND_URL  = process.env.BACKEND_URL  || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";

const OUT_CART     = path.join(REPO_ROOT, "docs/static/img/demo/flows/01-cart-to-quote");
const OUT_APPROVAL = path.join(REPO_ROOT, "docs/static/img/demo/flows/02-approval");

fs.mkdirSync(OUT_CART,     { recursive: true });
fs.mkdirSync(OUT_APPROVAL, { recursive: true });

// ─── API helpers ─────────────────────────────────────────────────────────────

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

async function getNZDRegion(pubKey) {
  const res = await fetch(`${BACKEND_URL}/store/regions`, {
    headers: { "x-publishable-api-key": pubKey },
  });
  const data = await res.json();
  return (data.regions || []).find(r => r.currency_code === "nzd") || null;
}

async function getProducts(pubKey, regionId) {
  const res = await fetch(
    `${BACKEND_URL}/store/products?limit=50&region_id=${regionId}&fields=id,title,handle,variants.id,variants.sku,variants.calculated_price`,
    { headers: { "x-publishable-api-key": pubKey } }
  );
  return (await res.json()).products || [];
}

async function resetApprovalToPending(adminToken, approvalId) {
  // Call API to reset approval.status
  const res = await fetch(`${BACKEND_URL}/admin/approvals/${approvalId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending" }),
  });
  if (!res.ok) throw new Error(`Reset approval failed: ${res.status}`);
  const approval = (await res.json()).approval;

  // ALSO reset approval_status.status directly via DB
  // The updateApprovalStatusStep only sets approval_status to "approved" — not "pending".
  // So after the API call above, approval.status=pending but approval_status.status is still "approved".
  // We must directly update the approval_status record.
  const { Client } = pg;
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "ec-store",
    user: "postgres",
    password: "postgres",
  });
  await client.connect();
  const result = await client.query(
    `UPDATE approval_status SET status='pending', updated_at=NOW()
     WHERE cart_id = $1
     RETURNING id, status`,
    [approval.cart_id]
  );
  await client.end();
  console.log(`  DB reset approval_status: ${JSON.stringify(result.rows)}`);

  return approval;
}

async function approveApproval(adminToken, approvalId) {
  const res = await fetch(`${BACKEND_URL}/admin/approvals/${approvalId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
  return (await res.json()).approval;
}

async function getBuyerCart(buyerToken, pubKey) {
  const res = await fetch(
    `${BACKEND_URL}/store/customers/me?fields=%2Bcarts.*,+carts.items.*`,
    { headers: { Authorization: `Bearer ${buyerToken}`, "x-publishable-api-key": pubKey } }
  );
  const data = await res.json();
  return data.customer?.carts?.[0] || null;
}

async function createBuyerCart(buyerToken, pubKey, regionId, salesChannelId) {
  const res = await fetch(`${BACKEND_URL}/store/carts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerToken}`,
      "x-publishable-api-key": pubKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ region_id: regionId, sales_channel_id: salesChannelId }),
  });
  if (!res.ok) throw new Error(`Create cart failed: ${res.status}: ${await res.text()}`);
  return (await res.json()).cart;
}

async function addItemToCart(buyerToken, pubKey, cartId, variantId, quantity) {
  const res = await fetch(`${BACKEND_URL}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerToken}`,
      "x-publishable-api-key": pubKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Add item failed (${res.status}): ${body}`);
  }
  return (await res.json()).cart;
}

async function getApprovals(adminToken) {
  const res = await fetch(`${BACKEND_URL}/admin/approvals?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error(`Get approvals failed: ${res.status}`);
  return await res.json();
}

// ─── Screenshot helper ────────────────────────────────────────────────────────

function save(buf, filePath) {
  fs.writeFileSync(filePath, buf);
  console.log(`  SAVED: ${filePath} (${Math.round(buf.length / 1024)}KB)`);
  return filePath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== CEO Fresh Capture ===");
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Storefront: ${STOREFRONT_URL}`);

  // ── Step 1: API setup ──────────────────────────────────────────────────────
  console.log("\n[1/7] Authenticating...");
  const adminToken  = await getAdminToken();
  const buyerToken  = await getBuyerToken();
  const pubKey      = await getPublishableKey(adminToken);
  console.log(`  pubKey: ${pubKey.slice(0, 20)}...`);

  // ── Step 2: Reset approval to pending ─────────────────────────────────────
  console.log("\n[2/7] Resetting approval to pending...");
  const APPROVAL_ID = "appr_01KTJPADHRQ6457KFCTF1JZ1VX";
  const resetApproval = await resetApprovalToPending(adminToken, APPROVAL_ID);
  console.log(`  Approval ${resetApproval.id} status: ${resetApproval.status}`);

  // ── Step 3: Build buyer cart with 3 compelling NZD items ──────────────────
  console.log("\n[3/7] Building buyer cart...");
  const nzRegion = await getNZDRegion(pubKey);
  if (!nzRegion) throw new Error("No NZD region found");
  console.log(`  NZ region: ${nzRegion.id}`);

  // Get sales channel
  const scRes = await fetch(`${BACKEND_URL}/admin/sales-channels?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const scData = await scRes.json();
  const salesChannel = (scData.sales_channels || [])[0];
  console.log(`  Sales channel: ${salesChannel?.id}`);

  // Get products with NZD prices
  const products = await getProducts(pubKey, nzRegion.id);
  console.log(`  Products loaded: ${products.length}`);

  // Target: 3 items that are compelling demo products
  // Laptop (2,077-2,143 NZD) + Phone (1,582 NZD) + Monitor (988 NZD) = ~4,647 NZD
  const findVariant = (skuFragment) => {
    for (const p of products) {
      for (const v of (p.variants || [])) {
        if (v.sku && v.sku.includes(skuFragment)) return { product: p, variant: v };
      }
    }
    return null;
  };

  const laptopItem  = findVariant("512-RED") || findVariant("256-BLUE");
  const phoneItem   = findVariant("PHONE-256-RED");
  const monitorItem = findVariant("ACME-MONITOR-BLACK") || findVariant("ACME-MONITOR-WHITE");

  console.log(`  Laptop variant: ${laptopItem?.variant?.sku || "NOT FOUND"}`);
  console.log(`  Phone variant:  ${phoneItem?.variant?.sku || "NOT FOUND"}`);
  console.log(`  Monitor variant: ${monitorItem?.variant?.sku || "NOT FOUND"}`);

  if (!laptopItem || !phoneItem || !monitorItem) {
    throw new Error("Missing required product variants for cart build");
  }

  // Check if buyer already has a cart with these items
  // Create a fresh cart via storefront API
  let cart;
  try {
    cart = await createBuyerCart(buyerToken, pubKey, nzRegion.id, salesChannel?.id);
    console.log(`  New cart created: ${cart.id}`);
  } catch (e) {
    // If cart creation fails (e.g. customer already has active cart), get existing
    console.log(`  Cart creation failed (${e.message.slice(0,80)}) — trying to get existing cart`);
    const custRes = await fetch(
      `${BACKEND_URL}/store/customers/me?fields=id`,
      { headers: { Authorization: `Bearer ${buyerToken}`, "x-publishable-api-key": pubKey } }
    );
    const custData = await custRes.json();
    console.log(`  Customer data keys: ${Object.keys(custData).join(", ")}`);
    // Continue with the existing seed cart
    cart = { id: "cart_01KTJPADGC546FRCA517WJ2469" };
    console.log(`  Using seed cart: ${cart.id}`);
  }

  // Add items to cart
  try {
    console.log(`  Adding Laptop (${laptopItem.variant.sku})...`);
    cart = await addItemToCart(buyerToken, pubKey, cart.id, laptopItem.variant.id, 1);
    console.log(`  Laptop added. Cart total: ${cart.total}`);

    console.log(`  Adding Phone (${phoneItem.variant.sku})...`);
    cart = await addItemToCart(buyerToken, pubKey, cart.id, phoneItem.variant.id, 1);
    console.log(`  Phone added. Cart total: ${cart.total}`);

    console.log(`  Adding Monitor (${monitorItem.variant.sku})...`);
    cart = await addItemToCart(buyerToken, pubKey, cart.id, monitorItem.variant.id, 1);
    console.log(`  Monitor added. Cart total: ${cart.total}`);

    // Get detailed cart for item count
    const cartDetailRes = await fetch(
      `${BACKEND_URL}/store/carts/${cart.id}?fields=%2Bitems.*`,
      { headers: { Authorization: `Bearer ${buyerToken}`, "x-publishable-api-key": pubKey } }
    );
    const cartDetail = (await cartDetailRes.json()).cart || {};
    console.log(`  Cart items: ${cartDetail.items?.length}, total: ${cartDetail.total}`);
  } catch (e) {
    console.log(`  WARN: Cart item add failed: ${e.message}`);
    console.log(`  Proceeding with existing cart state`);
  }

  // ── Step 4: Launch browser ─────────────────────────────────────────────────
  console.log("\n[4/7] Launching browser...");
  const browser = await chromium.launch({ headless: true });

  // The storefront uses HttpOnly, SameSite=strict cookies:
  //   _medusa_jwt      — buyer auth token
  //   _medusa_cart_id  — active cart ID
  // These cannot be set via document.cookie (httpOnly).
  // Use Playwright context.addCookies() to inject them before first navigation.
  const sfHostname = new URL(STOREFRONT_URL).hostname;

  const sfCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Inject auth + cart cookies directly
  await sfCtx.addCookies([
    {
      name: "_medusa_jwt",
      value: buyerToken,
      domain: sfHostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      expires: Math.floor(Date.now() / 1000) + 86400 * 7,
    },
    {
      name: "_medusa_cart_id",
      value: cart.id,
      domain: sfHostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      expires: Math.floor(Date.now() / 1000) + 86400 * 7,
    },
  ]);
  console.log(`  Injected _medusa_jwt and _medusa_cart_id (${cart.id}) cookies`);
  const sfPage = await sfCtx.newPage();

  // ── Step 5: Beat 1 — Cart page ────────────────────────────────────────────
  console.log("\n[5/7] Capturing storefront beats...");

  await sfPage.goto(`${STOREFRONT_URL}/nz/cart`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sfPage.waitForTimeout(4000);

  const cartText = await sfPage.textContent("body");
  const hasNZD   = cartText.includes("NZ$") || cartText.includes("NZD");
  console.log(`  Beat 1 cart — NZD visible: ${hasNZD}`);
  console.log(`  Cart body snippet: ${cartText.slice(0, 200)}`);

  const beat1 = await sfPage.screenshot();
  save(beat1, path.join(OUT_CART, "step-01.png"));

  // ── Beat 2: Quote modal ───────────────────────────────────────────────────
  // Try various selectors for the Request Quote button
  const quoteBtnSelectors = [
    'button:has-text("Request Quote")',
    'button:has-text("Request quote")',
    'a:has-text("Request Quote")',
    '[data-testid*="quote"]',
    'button:has-text("Quote")',
  ];

  let quoteModal = false;
  for (const sel of quoteBtnSelectors) {
    const btn = sfPage.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`  Found quote button: ${sel}`);
      await btn.click();
      await sfPage.waitForTimeout(1500);
      const modalText = await sfPage.textContent("body");
      quoteModal = modalText.includes("Submit") || modalText.includes("request") || modalText.includes("quote");
      break;
    }
  }
  console.log(`  Beat 2 quote modal visible: ${quoteModal}`);
  const beat2 = await sfPage.screenshot();
  save(beat2, path.join(OUT_CART, "step-04.png"));

  // Close modal if open
  const cancelBtn = sfPage.locator('button:has-text("Cancel"), button[aria-label="Close"], button:has-text("Close")').first();
  if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cancelBtn.click();
    await sfPage.waitForTimeout(500);
  }

  // ── Beat 3: Quotes list ───────────────────────────────────────────────────
  await sfPage.goto(`${STOREFRONT_URL}/nz/account/quotes`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sfPage.waitForTimeout(5000);

  const quotesText = await sfPage.textContent("body");
  const hasPendingMerchant = quotesText.includes("Pending Merchant") || quotesText.includes("pending_merchant");
  console.log(`  Beat 3 quotes — Pending Merchant: ${hasPendingMerchant}`);
  const beat3 = await sfPage.screenshot();
  save(beat3, path.join(OUT_CART, "step-05.png"));

  await sfCtx.close();

  // ── Steps 4+5+6: Admin beats ──────────────────────────────────────────────
  console.log("\n[6/7] Capturing admin beats...");
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const adminPage = await adminCtx.newPage();

  // Admin login via session
  await adminPage.goto(`${BACKEND_URL}/app/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await adminPage.waitForTimeout(2000);

  const adminEmail = adminPage.locator('input[type="email"], input[name="email"], input').first();
  await adminEmail.fill("admin@test.local");
  const adminPass = adminPage.locator('input[type="password"]').first();
  await adminPass.fill("Test1234!");
  await adminPage.locator('button[type="submit"]').first().click();
  await adminPage.waitForTimeout(4000);
  console.log(`  Admin logged in. URL: ${adminPage.url()}`);

  // Beat 4: Approvals list — pending state
  await adminPage.goto(`${BACKEND_URL}/app/approvals`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await adminPage.waitForTimeout(3000);

  const approvalText4 = await adminPage.textContent("body");
  const hasDemoCorp = approvalText4.includes("Demo Corp");
  const hasPending4  = approvalText4.includes("Pending");
  console.log(`  Beat 4 approval — Demo Corp: ${hasDemoCorp}, Pending: ${hasPending4}`);

  const beat4 = await adminPage.screenshot();
  save(beat4, path.join(OUT_APPROVAL, "step-01.png"));
  // Beat 5 is the same view (pre-approve state for "govern" narrative)
  save(beat4, path.join(OUT_APPROVAL, "step-05b-govern-approve.png"));

  // Beat 6: approve via API, then refresh and capture
  console.log("  Calling approve API...");
  const approved = await approveApproval(adminToken, APPROVAL_ID);
  console.log(`  Approval status: ${approved.status}`);

  await adminPage.reload({ waitUntil: "domcontentloaded" });
  await adminPage.waitForTimeout(3000);

  const approvalText6 = await adminPage.textContent("body");
  const hasApproved6  = approvalText6.includes("Approved") || approvalText6.toLowerCase().includes("approved");
  console.log(`  Beat 6 approval — Approved: ${hasApproved6}`);

  const beat6 = await adminPage.screenshot();
  save(beat6, path.join(OUT_APPROVAL, "step-06b-approved-audit.png"));

  await adminCtx.close();
  await browser.close();

  // ── Step 7: Verify all frames exist ───────────────────────────────────────
  console.log("\n[7/7] Verifying frame files...");
  const required = [
    path.join(OUT_CART,     "step-01.png"),
    path.join(OUT_CART,     "step-04.png"),
    path.join(OUT_CART,     "step-05.png"),
    path.join(OUT_APPROVAL, "step-01.png"),
    path.join(OUT_APPROVAL, "step-05b-govern-approve.png"),
    path.join(OUT_APPROVAL, "step-06b-approved-audit.png"),
  ];

  let allOk = true;
  for (const p of required) {
    const exists = fs.existsSync(p);
    const size   = exists ? Math.round(fs.statSync(p).size / 1024) : 0;
    console.log(`  ${exists ? "OK" : "MISSING"} ${p} (${size}KB)`);
    if (!exists || size < 10) allOk = false;
  }

  console.log(`\n=== CEO capture ${allOk ? "COMPLETE" : "PARTIAL — check MISSING frames"} ===`);
  if (!allOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
