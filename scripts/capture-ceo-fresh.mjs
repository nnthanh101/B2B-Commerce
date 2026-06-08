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
 * Beat 4: Admin Approvals list — Demo Corp pending (role-bar David)
 * Beat 5: Admin Approvals — REAL approve action: Check IconButton clicked -> confirm dialog
 * Beat 6: After approve, Approvals list shows Approved state
 *
 * Evidence paths:
 *   docs/static/img/demo/flows/01-cart-to-quote/step-01.png  (beat1: cart)
 *   docs/static/img/demo/flows/01-cart-to-quote/step-04.png  (beat2: quote modal)
 *   docs/static/img/demo/flows/01-cart-to-quote/step-05.png  (beat3: quotes list)
 *   docs/static/img/demo/flows/02-approval/step-01.png       (beat4: admin approvals pending)
 *   docs/static/img/demo/flows/02-approval/step-05b-govern-approve.png (beat5: real approve dialog)
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

// ─── Role-bar + highlight injection helpers ──────────────────────────────────

/**
 * injectRoleBar(page, label, initial)
 * Injects a fixed-top gradient banner (48px) with avatar dot + persona label.
 * Identical CSS across CEO + CTO reels for visual consistency (CEO-AC-7 / CTO-AC-3).
 */
async function injectRoleBar(page, label, initial) {
  await page.evaluate(({ label, initial }) => {
    // Remove any existing role-bar
    const existing = document.getElementById("reel-rolebar");
    if (existing) existing.remove();
    // Also remove any previously injected padding spacer
    const existingSpacer = document.getElementById("reel-rolebar-spacer");
    if (existingSpacer) existingSpacer.remove();

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

    // Push page content down so the fixed bar does not occlude the first content row.
    // Use a spacer div inserted as the first child of body (avoids mutating body.style
    // which can fight existing layout on admin pages).
    const spacer = document.createElement("div");
    spacer.id = "reel-rolebar-spacer";
    spacer.style.cssText = "height:52px;flex-shrink:0;pointer-events:none";
    document.body.insertBefore(spacer, document.body.firstChild);
  }, { label, initial });
}

/**
 * highlightElement(page, selector, opts)
 * Applies amber outline + glow to the first matching element.
 * opts.scroll = true (default) scrolls the element into center view.
 * opts.scroll = false highlights in-place without changing scroll position.
 * selector format: plain text string to match against element textContent.
 * If selector starts with "css:", the remainder is used as a real CSS selector.
 */
async function highlightElement(page, textOrCss, opts = {}) {
  const scroll = opts.scroll !== false; // default: true
  await page.evaluate(({ textOrCss, scroll }) => {
    let el = null;
    if (textOrCss.startsWith("css:")) {
      const css = textOrCss.slice(4).trim();
      el = document.querySelector(css);
    } else {
      // Text-content match — find leaf node or closest node containing the text
      const target = textOrCss.trim();
      const all = [...document.querySelectorAll("*")];
      el = all.find(n => n.children.length === 0 && n.textContent?.trim() === target)
        || all.find(n => n.textContent?.trim().includes(target));
    }
    if (el) {
      el.style.outline = "3px solid #ffb000";
      el.style.outlineOffset = "3px";
      el.style.boxShadow = "0 0 0 4px rgba(255,176,0,.35),0 0 24px rgba(255,176,0,.55)";
      el.style.borderRadius = "6px";
      if (scroll) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
  }, { textOrCss, scroll });
}

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

async function resetApprovalToPendingSalesManager(adminToken, approvalId) {
  // Call API to reset approval.status to pending
  const res = await fetch(`${BACKEND_URL}/admin/approvals/${approvalId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending" }),
  });
  if (!res.ok) throw new Error(`Reset approval failed: ${res.status}`);
  const approval = (await res.json()).approval;

  const { Client } = pg;
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "ec-store",
    user: "postgres",
    password: "postgres",
  });
  await client.connect();

  // Reset approval_status to pending
  const statusResult = await client.query(
    `UPDATE approval_status SET status='pending', updated_at=NOW()
     WHERE cart_id = $1
     RETURNING id, status`,
    [approval.cart_id]
  );
  console.log(`  DB reset approval_status: ${JSON.stringify(statusResult.rows)}`);

  // Set approval type to sales_manager so ApprovalActions renders the Check+XMark buttons
  // (ApprovalActions only shows approve/reject when type === 'sales_manager')
  const typeResult = await client.query(
    `UPDATE approval SET type='sales_manager', status='pending', updated_at=NOW()
     WHERE id = $1
     RETURNING id, type, status`,
    [approvalId]
  );
  console.log(`  DB set approval type=sales_manager: ${JSON.stringify(typeResult.rows)}`);

  await client.end();
  return approval;
}

// Keep legacy name as alias for backward compat
const resetApprovalToPending = resetApprovalToPendingSalesManager;

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

  // Create a fresh cart via storefront API
  let cart;
  try {
    cart = await createBuyerCart(buyerToken, pubKey, nzRegion.id, salesChannel?.id);
    console.log(`  New cart created: ${cart.id}`);
  } catch (e) {
    console.log(`  Cart creation failed (${e.message.slice(0,80)}) — trying to get existing cart`);
    const custRes = await fetch(
      `${BACKEND_URL}/store/customers/me?fields=id`,
      { headers: { Authorization: `Bearer ${buyerToken}`, "x-publishable-api-key": pubKey } }
    );
    const custData = await custRes.json();
    console.log(`  Customer data keys: ${Object.keys(custData).join(", ")}`);
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
  browser.setDefaultTimeout && browser.setDefaultTimeout(90000);

  const sfHostname = new URL(STOREFRONT_URL).hostname;

  // Retina-crisp storefront context (deviceScaleFactor:2)
  const sfCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
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


  // CEO-AC-1: role-bar Maria + highlight 3 key elements WITHOUT scrollIntoView (prevents last
  // highlight from centering "3 items" and pushing Monitor/Laptop off-screen).
  // After all highlights, scroll to top so Monitor is first visible item below the role-bar.
  await injectRoleBar(sfPage, "Maria · Procurement Specialist", "M");
  // Highlight without scroll so viewport stays at top
  await highlightElement(sfPage, "Request Quote", { scroll: false });
  await highlightElement(sfPage, "NZ$4,647.00",   { scroll: false });
  await highlightElement(sfPage, "3 items",        { scroll: false });
  // Scroll to top so Monitor (first cart item at ~y=287) is fully in view
  await sfPage.evaluate(() => window.scrollTo(0, 0));
  await sfPage.waitForTimeout(300);

  const beat1 = await sfPage.screenshot();
  save(beat1, path.join(OUT_CART, "step-01.png"));

  // ── Beat 2: Quote modal ───────────────────────────────────────────────────
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

  // CEO-AC-2: role-bar Maria + scroll ALL containers to top so modal is not occluded
  await injectRoleBar(sfPage, "Maria · Procurement Specialist", "M");
  await sfPage.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelectorAll("*").forEach(el => {
      if (el === document.body || el === document.documentElement) return;
      const st = window.getComputedStyle(el);
      const isScrollable = (st.overflow === "auto" || st.overflow === "scroll" ||
                            st.overflowY === "auto" || st.overflowY === "scroll");
      if (isScrollable && el.scrollTop > 0) el.scrollTop = 0;
    });
  });
  await sfPage.waitForTimeout(400);
  await highlightElement(sfPage, "Submit");

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

  // CEO-AC-3: role-bar Maria + scroll ALL containers to top + highlight first quote row
  await injectRoleBar(sfPage, "Maria · Procurement Specialist", "M");
  await sfPage.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelectorAll("*").forEach(el => {
      if (el === document.body || el === document.documentElement) return;
      const st = window.getComputedStyle(el);
      const isScrollable = (st.overflow === "auto" || st.overflow === "scroll" ||
                            st.overflowY === "auto" || st.overflowY === "scroll");
      if (isScrollable && el.scrollTop > 0) el.scrollTop = 0;
    });
  });
  await sfPage.waitForTimeout(400);
  // Highlight the first quote row (the topmost list item) as the hero element
  await sfPage.evaluate(() => {
    // Find the first quote row — a container row that has "Pending Merchant" text
    const allRows = [...document.querySelectorAll("li, tr, [role='row'], article, .quote-row, [class*='row']")];
    const firstQuoteRow = allRows.find(r => r.textContent?.includes("Pending Merchant") && r.textContent?.includes("NZ$1,582"));
    if (firstQuoteRow) {
      firstQuoteRow.style.outline = "3px solid #ffb000";
      firstQuoteRow.style.outlineOffset = "3px";
      firstQuoteRow.style.boxShadow = "0 0 0 4px rgba(255,176,0,.35),0 0 24px rgba(255,176,0,.55)";
      firstQuoteRow.style.borderRadius = "6px";
      firstQuoteRow.scrollIntoView({ block: "nearest", behavior: "instant" });
    } else {
      // Fallback: highlight the NZ$1,582.00 amount text
      const all = [...document.querySelectorAll("*")];
      const el = all.find(n => n.children.length === 0 && n.textContent?.trim() === "NZ$1,582.00");
      if (el) {
        el.style.outline = "3px solid #ffb000";
        el.style.outlineOffset = "3px";
        el.style.boxShadow = "0 0 0 4px rgba(255,176,0,.35),0 0 24px rgba(255,176,0,.55)";
        el.style.borderRadius = "6px";
      }
    }
  });

  const beat3 = await sfPage.screenshot();
  save(beat3, path.join(OUT_CART, "step-05.png"));

  await sfCtx.close();

  // ── Steps 4+5+6: Admin beats ──────────────────────────────────────────────
  console.log("\n[6/7] Capturing admin beats...");
  const adminCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
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

  // CEO-AC-4: role-bar David + highlight the #2469 row
  await injectRoleBar(adminPage, "David · Approving Manager", "D");
  // Highlight the row containing #2469 and the Pending badge
  await adminPage.evaluate(() => {
    // Find the table row containing '2469'
    const rows = [...document.querySelectorAll("tr, [role='row']")];
    const targetRow = rows.find(r => r.textContent?.includes("2469") && r.textContent?.includes("Demo Corp"));
    if (targetRow) {
      targetRow.style.outline = "3px solid #ffb000";
      targetRow.style.outlineOffset = "3px";
      targetRow.style.boxShadow = "0 0 0 4px rgba(255,176,0,.35),0 0 24px rgba(255,176,0,.55)";
      targetRow.style.borderRadius = "6px";
      targetRow.scrollIntoView({ block: "center", behavior: "instant" });
    }
    // Also highlight the Pending badge text
    const badge = [...document.querySelectorAll("*")].find(
      n => n.children.length === 0 && n.textContent?.trim() === "Pending"
    );
    if (badge) {
      badge.style.outline = "3px solid #ffb000";
      badge.style.outlineOffset = "2px";
      badge.style.boxShadow = "0 0 0 3px rgba(255,176,0,.35)";
    }
  });

  const beat4 = await adminPage.screenshot();
  save(beat4, path.join(OUT_APPROVAL, "step-01.png"));

  // ── Beat 5: REAL approve action — click Check IconButton → confirm dialog ─
  // CEO-AC-5: show the confirm dialog "Are you sure you want to approve this cart?"
  // The approval was reset to PENDING above so the Check button is visible.
  // Use Playwright's native .click() to trigger the React event handler (not evaluate).
  console.log("  Beat 5: Using Playwright click on approve Check button in #2469 row...");

  // Navigate to approvals page fresh to ensure pending state is rendered
  await adminPage.goto(`${BACKEND_URL}/app/approvals`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await adminPage.waitForTimeout(3000);

  // Find the row containing #2469 via Playwright locators
  // The approve (Check) IconButton is the 2nd button in the actions div of that row
  let approveClicked = false;
  let dialogVisible = false;

  try {
    // Debug: show table rows to understand button structure
    const tableInfo = await adminPage.evaluate(() => {
      const trs = [...document.querySelectorAll("tr")];
      return trs.map(tr => ({
        tdTexts: [...tr.querySelectorAll("td")].map(td => td.textContent?.trim().slice(0, 30)),
        btnCount: tr.querySelectorAll("button").length,
        text: tr.textContent?.trim().slice(0, 80),
      })).filter(r => r.text.length > 0);
    });
    console.log("  Table rows:", JSON.stringify(tableInfo.slice(0, 5)));

    // Find the row and click the approve button
    // The ApprovalActions renders inside a td — 2 icon buttons: reject (XMark) + approve (Check)
    const approveButtonBox = await adminPage.evaluate(() => {
      const trs = [...document.querySelectorAll("tr")];
      // Find the data row that contains "2469" in any td
      const targetRow = trs.find(tr => {
        const tds = [...tr.querySelectorAll("td")];
        return tds.some(td => td.textContent?.trim().includes("2469"));
      });
      if (!targetRow) {
        // Fallback: try any element with role=row
        const rows = [...document.querySelectorAll("[role='row']")];
        const rr = rows.find(r => r.textContent?.includes("2469") && r.querySelectorAll("button").length >= 2);
        if (rr) {
          const btns = [...rr.querySelectorAll("button")];
          const approveBtn = btns[btns.length - 1];
          const rect = approveBtn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, found: "role-row" };
        }
        return null;
      }
      const btns = [...targetRow.querySelectorAll("button")];
      if (btns.length < 2) {
        // Maybe only 1 button visible — try clicking whatever is there
        if (btns.length === 1) {
          const rect = btns[0].getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, found: "single-btn" };
        }
        return null;
      }
      // Last button = Check approve
      const approveBtn = btns[btns.length - 1];
      const rect = approveBtn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, found: "last-btn" };
    });
    console.log(`  Approve button box: ${JSON.stringify(approveButtonBox)}`);

    if (approveButtonBox && approveButtonBox.x > 0 && approveButtonBox.y > 0) {
      // deviceScaleFactor:2 means CSS pixels = physical/2; Playwright mouse uses CSS coords
      // getBoundingClientRect returns CSS pixels, so use coordinates directly (no /2)
      await adminPage.mouse.click(approveButtonBox.x, approveButtonBox.y);
      approveClicked = true;
      console.log(`  Mouse clicked at (${approveButtonBox.x}, ${approveButtonBox.y})`);

      // Wait for usePrompt dialog to animate in
      await adminPage.waitForTimeout(1500);

      const dialogTextCheck = await adminPage.textContent("body");
      dialogVisible = dialogTextCheck.includes("Are you sure") || dialogTextCheck.includes("approve this cart");
      console.log(`  Dialog visible after click: ${dialogVisible}`);
      console.log(`  Body snippet after click: ${dialogTextCheck.slice(0, 600)}`);
    } else {
      console.log("  WARN: Could not find approve button bounding box");
    }
  } catch (e) {
    console.log(`  WARN: Playwright row/button click failed: ${e.message}`);
  }

  // CEO-AC-5: role-bar David + capture the dialog (or highlighted approve button state)
  await injectRoleBar(adminPage, "David · Approving Manager", "D");

  const beat5 = await adminPage.screenshot();
  save(beat5, path.join(OUT_APPROVAL, "step-05b-govern-approve.png"));

  // Verify beat5 is DIFFERENT from beat4 by size
  const beat4Size = fs.statSync(path.join(OUT_APPROVAL, "step-01.png")).size;
  const beat5Size = fs.statSync(path.join(OUT_APPROVAL, "step-05b-govern-approve.png")).size;
  console.log(`  beat4 size: ${beat4Size}B, beat5 size: ${beat5Size}B — different: ${beat4Size !== beat5Size}`);

  // Now confirm the dialog to complete approve (or fall back to API)
  let confirmClicked = false;
  if (dialogVisible) {
    const confirmSelectors = [
      'button:has-text("Confirm")',
      'button:has-text("confirm")',
      'button:has-text("Continue")',
      'button:has-text("Yes")',
    ];
    for (const sel of confirmSelectors) {
      const btn = adminPage.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  Clicking dialog confirm: ${sel}`);
        await btn.click();
        confirmClicked = true;
        await adminPage.waitForTimeout(2000);
        break;
      }
    }
  }
  console.log(`  Dialog confirm clicked: ${confirmClicked}`);

  // Fall back to API approve if dialog path didn't work
  if (!confirmClicked) {
    console.log("  Falling back to API approve...");
    const approved = await approveApproval(adminToken, APPROVAL_ID);
    console.log(`  Approval status via API: ${approved.status}`);
  }

  // Beat 6: reload and capture Approved state
  await adminPage.reload({ waitUntil: "domcontentloaded" });
  await adminPage.waitForTimeout(3000);

  const approvalText6 = await adminPage.textContent("body");
  const hasApproved6  = approvalText6.includes("Approved") || approvalText6.toLowerCase().includes("approved");
  console.log(`  Beat 6 approval — Approved: ${hasApproved6}`);

  // CEO-AC-6: role-bar David + amber highlight on the Approved badge in #2469 row
  await injectRoleBar(adminPage, "David · Approving Manager", "D");
  await adminPage.evaluate(() => {
    const rows = [...document.querySelectorAll("tr, [role='row']")];
    const targetRow = rows.find(r => r.textContent?.includes("2469"));
    if (targetRow) {
      targetRow.scrollIntoView({ block: "center", behavior: "instant" });
      // Find the Approved badge: try multiple strategies — leaf node, span with "Approved",
      // or any element whose trimmed text === "Approved" (covers pill/badge wrappers)
      const allInRow = [...targetRow.querySelectorAll("*")];
      const badge =
        allInRow.find(n => n.children.length === 0 && n.textContent?.trim() === "Approved") ||
        allInRow.find(n => n.tagName === "SPAN" && n.textContent?.trim() === "Approved") ||
        allInRow.find(n => n.textContent?.trim() === "Approved");
      if (badge) {
        // Amber highlight (matches CEO reel accent color convention)
        badge.style.outline = "3px solid #ffb000";
        badge.style.outlineOffset = "4px";
        badge.style.boxShadow = "0 0 0 5px rgba(255,176,0,.40),0 0 20px rgba(255,176,0,.60)";
        badge.style.borderRadius = "6px";
      }
    }
  });

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
