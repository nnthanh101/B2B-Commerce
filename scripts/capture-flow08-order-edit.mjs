#!/usr/bin/env node
/**
 * Capture flow-08: Order Editing — focused 5-beat admin capture
 *
 * Captures the Medusa admin order-edit flow:
 *   Beat 1: Admin orders list (order #2 visible)
 *   Beat 2: Order detail — full page with Edit Order widget loaded
 *   Beat 3: Scroll to Edit Order widget (line items + Add item button)
 *   Beat 4: Scroll to order totals (current total / new total)
 *   Beat 5: Order header / audit (top of page, order info summary)
 *
 * Output:
 *   docs/static/img/demo/flows/08-order-edit/step-01.png .. step-05.png
 *   tmp/B2B-Commerce/demo/flows/08-order-edit/step-01.png .. step-05.png
 *   tmp/B2B-Commerce/demo/capture-flow08-YYYY-MM-DD.json
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, "../..").toString().replace(/^file:\/\//, "");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Test1234!";

const TMP_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows/08-order-edit");
const DOCS_DIR = path.join(REPO_ROOT, "docs/static/img/demo/flows/08-order-edit");

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

// Error markers — must not appear in a promoted frame
const ERROR_MARKERS = [
  "Forbidden", "Internal Server Error", "Application error",
  "__next_error__", "404 - There is no page", "Something went wrong",
  "something went wrong", "Not Found", "This page could not be found",
];

async function dismissDevOverlays(page) {
  await page.evaluate(() => {
    ["nextjs-portal", "[data-nextjs-dialog-overlay]", "[data-nextjs-toast]"]
      .forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
    const style = document.createElement("style");
    style.textContent = [
      "nextjs-portal { display: none !important; }",
      "[data-nextjs-dialog-overlay] { display: none !important; }",
      "[data-nextjs-toast] { display: none !important; }",
    ].join("\n");
    document.head.appendChild(style);
  }).catch(() => {});
}

async function captureStep(page, stepNum, label) {
  await dismissDevOverlays(page);
  await page.waitForTimeout(600);

  const filename = `step-${String(stepNum).padStart(2, "0")}.png`;
  const tmpPath = path.join(TMP_DIR, filename);
  const docsPath = path.join(DOCS_DIR, filename);

  await page.screenshot({ path: tmpPath, fullPage: false });

  const pageText = await page.evaluate(() => document.body.innerText).catch(() => "");
  const errors = ERROR_MARKERS.filter(m => pageText.includes(m));

  let promoted = false;
  if (errors.length === 0) {
    fs.copyFileSync(tmpPath, docsPath);
    promoted = true;
    console.log(`  step-${String(stepNum).padStart(2, "0")} PASS → promoted  [${label}]`);
  } else {
    console.log(`  step-${String(stepNum).padStart(2, "0")} FAIL (errors: ${errors.join(", ")})  [${label}] — tmp only`);
  }

  return { filename, tmpPath, docsPath, promoted, errors };
}

async function getFirstNzdOrderId() {
  const res = await fetch(`${BACKEND_URL}/admin/orders?limit=50&order=-created_at`, {
    headers: {
      Authorization: `Bearer ${global.adminToken}`,
    },
  });
  if (!res.ok) throw new Error(`GET /admin/orders failed: ${res.status}`);
  const data = await res.json();
  const orders = data.orders || [];
  // Prefer demo_completed_order, else first order with currency/NZD total
  const order =
    orders.find(o => o.metadata?.demo_completed_order === true) ||
    orders.find(o => o.total > 0) ||
    orders[0];
  if (!order) throw new Error("No orders found — run task seed to populate demo data");
  return { id: order.id, display_id: order.display_id, total: order.total };
}

async function loginAdmin(page) {
  console.log(`  Navigating to ${BACKEND_URL}/app/login`);
  await page.goto(`${BACKEND_URL}/app/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  const emailSel = page.locator("input[name=email], input[type=email]").first();
  let emailVisible = await emailSel.isVisible().catch(() => false);
  if (!emailVisible) {
    console.log("  Login form not visible on first load — reloading...");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000);
    emailVisible = await emailSel.isVisible().catch(() => false);
  }
  if (!emailVisible) {
    throw new Error("Admin login form not visible after reload — admin SPA unreachable inside container");
  }

  await page.locator("input[name=email], input[type=email]").first().fill(ADMIN_EMAIL);
  await page.locator("input[type=password]").fill(ADMIN_PASSWORD);
  await page.locator("button[type=submit]").click();

  await page.waitForURL(u => !u.toString().includes("/login"), { timeout: 25000 });
  await page.waitForTimeout(2500);
  console.log("  Admin login successful");
  return true;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Flow 08 — Order Editing (admin) — focused capture");
  console.log(`BACKEND: ${BACKEND_URL}`);
  console.log("=".repeat(60));

  // Get admin JWT for API calls (not browser)
  const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!authRes.ok) throw new Error(`Admin API login failed: ${authRes.status}`);
  const { token } = await authRes.json();
  global.adminToken = token;
  console.log(`  Admin API token obtained (prefix: ${token.slice(0, 20)}...)`);

  // Resolve the first NZD order
  const orderInfo = await getFirstNzdOrderId();
  const orderId = orderInfo.id;
  console.log(`  Target order: display_id=${orderInfo.display_id}, id=${orderId}, total=${orderInfo.total}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const frames = [];

  try {
    // Step 0: Authenticate
    await loginAdmin(page);

    // Step 1: Admin orders list — shows the seeded order
    console.log("\nStep 1: Admin orders list");
    await page.goto(`${BACKEND_URL}/app/orders`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(3000);
    frames.push(await captureStep(page, 1, "orders-list"));

    // Step 2: Order detail — full page with Edit Order widget
    console.log("\nStep 2: Order detail page");
    await page.goto(`${BACKEND_URL}/app/orders/${orderId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(4000);
    frames.push(await captureStep(page, 2, "order-detail-full"));

    // Step 3: Scroll to Edit Order widget section (it injects at zone "order.details.after")
    console.log("\nStep 3: Edit Order widget (scroll to bottom area)");
    // First scroll partway to find the widget
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
    await page.waitForTimeout(1000);
    // Try to locate the "Edit Order" heading from the widget
    const editOrderHeading = page.locator('h2:has-text("Edit Order"), [class*="Heading"]:has-text("Edit Order")').first();
    const editVisible = await editOrderHeading.isVisible().catch(() => false);
    if (editVisible) {
      await editOrderHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      console.log("  Edit Order widget heading found and scrolled into view");
    } else {
      // Widget may not have heading, scroll near bottom which is where zone "order.details.after" renders
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75));
      await page.waitForTimeout(800);
      console.log("  Edit Order heading not found — scrolled to 75% of page");
    }
    frames.push(await captureStep(page, 3, "edit-order-widget"));

    // Step 4: Scroll to totals section within the widget
    console.log("\nStep 4: Order totals (current total / new total)");
    // Look for "Current total" or "New total" text from the widget
    const currentTotalText = page.locator('text="Current total", text="New total"').first();
    const totalsVisible = await currentTotalText.isVisible().catch(() => false);
    if (totalsVisible) {
      await currentTotalText.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      console.log("  Current/New total text found and scrolled into view");
    } else {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
      await page.waitForTimeout(800);
      console.log("  Totals text not found — scrolled to 85% of page");
    }
    frames.push(await captureStep(page, 4, "order-totals-widget"));

    // Step 5: Order header (top of page) — shows order ID, status, customer
    console.log("\nStep 5: Order header / audit trail");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    frames.push(await captureStep(page, 5, "order-header-audit"));

  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`);
    const fallbackPath = path.join(TMP_DIR, "step-error-fallback.png");
    await page.screenshot({ path: fallbackPath }).catch(() => {});
    console.error(`  Fallback screenshot saved to: ${fallbackPath}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  const captured = frames.length;
  const promoted = frames.filter(f => f.promoted).length;
  const failed = frames.filter(f => !f.promoted).length;

  console.log("\n" + "=".repeat(60));
  console.log(`Captured: ${captured}  Promoted: ${promoted}  Failed: ${failed}`);

  const today = new Date().toISOString().split("T")[0];
  const manifestPath = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo", `capture-flow08-${today}.json`);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

  const manifest = {
    run_date: today,
    flow: "08",
    slug: "order-edit",
    persona: "admin",
    order_id: orderId,
    order_display_id: orderInfo.display_id,
    order_total_nzd: orderInfo.total,
    frames_captured: captured,
    frames_promoted: promoted,
    frames_failed: failed,
    verdict: promoted > 0 ? "PASS" : "FAIL",
    frames: frames.map(f => ({
      filename: f.filename,
      docs_path: f.docsPath,
      promoted: f.promoted,
      errors: f.errors,
    })),
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${manifestPath}`);

  if (promoted === 0) {
    console.error("FAIL: no frames promoted — all had error markers or capture failed");
    process.exit(1);
  }

  console.log("=".repeat(60));
  frames.forEach(f => {
    const marker = f.promoted ? "PASS" : "FAIL";
    console.log(`  [${marker}] ${f.filename}${f.errors.length ? ` — errors: ${f.errors.join(", ")}` : ""}`);
  });
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(2);
});
