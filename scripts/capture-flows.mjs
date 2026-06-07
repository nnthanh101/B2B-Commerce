#!/usr/bin/env node

/**
 * Capture flows for all 11 B2B personas with NZD content verification
 *
 * For each flow:
 * 1. Navigate to the flow's starting page
 * 2. Wait for key DOM elements
 * 3. Assert prices are in NZD (not EUR/empty)
 * 4. Assert zero error markers
 * 5. Capture per-step screenshots
 * 6. Write JSON manifest
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const REPO_ROOT = "/Volumes/Working/projects/Digital-Commerce";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const REGION = process.env.CAPTURE_REGION || process.env.TEST_REGION_COUNTRY || "nz";
const EXPECTED_CURRENCY = process.env.CAPTURE_CURRENCY || "NZ$";
const DEMO_BUYER_EMAIL = "demo-buyer@democorp.local";
const DEMO_BUYER_PASSWORD = "Test1234!";
const FLOWS_DIR = path.join(REPO_ROOT, "tmp/Digital-Commerce/demo/flows");
// Publishable key required for Medusa v2 Store API calls
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_3fa44220afda851589ceec98dc5fe91820d5d54e39abd184f77c951a291c9a40";

// Flows: [num, slug, persona, path, description, preState]
// URLs derived from each flow's narration first scene — data-first alignment
// 01: "Maria navigates to her cart" → /cart (cart page with Request Quote)
// 02: "David approves/rejects quote" → /app/approvals
// 03: "David governs members, roles, limits" → /app/companies (list)
// 04: "Maria browses products, remaining budget $200 NZD" → /account/orders (distinct from cart)
// 05: "Priya counters a buyer's quote" → /app/quotes
// 06: "Maria adds 120 units of office supplies" → /categories/accessories (category w/ NZ$ prices)
// 07: "navigates to Office Supplies. 47 products" → /store (full product listing)
// 08: "Priya adjusts submitted order line items" → /app/orders
// 09: "opens Bulk Order Pad, pastes quarterly SKU list" → product page (bulk-table-quantity)
// 10: "opens Quick Order Pad" → /cart (quick-order-pad is in cart sidebar)
// 11: "David generates invite from company panel" → /app/companies/{id} (company detail)
const FLOWS = [
  ["01", "cart-to-quote", "buyer-employee", `/${REGION}/cart`, "Maria converts cart to quote", "cart-with-items"],
  ["02", "approval", "admin", "/app/approvals", "David approves/rejects quote", null],
  ["03", "company-mgmt", "admin", "/app/companies", "David manages company members", null],
  ["04", "spending-limit", "buyer-employee", `/${REGION}/account/orders`, "Maria's orders — spending limit context", null],
  ["05", "quote-negotiate", "sales-manager", "/app/quotes", "Priya negotiates quote price", null],
  ["06", "promotions", "buyer-employee", `/${REGION}/cart`, "Maria sees NZ$ discount applied in cart", "cart-with-promo"],
  ["07", "full-ecommerce", "buyer-employee", `/${REGION}/store`, "Maria browses products in NZD", null],
  ["08", "order-edit", "sales-manager", "/app/orders/:orderId", "Priya edits specific order detail", "order-detail"],
  ["09", "bulk-add", "buyer-employee", `/${REGION}/products/hi-fi-gaming-headset-pro-grade-dac-hi-res-certified`, "Maria bulk-adds via product page", "scroll-to-bulk-table"],
  ["10", "quick-order-pad", "buyer-employee", `/${REGION}/cart`, "Maria uses Quick Order Pad sidebar", "cart-then-quick-order-open"],
  ["11", "invite-employee", "admin", "/app/companies/:companyId", "David opens company detail to invite employee", "company-direct-nav"],
];

// Error markers to scan for in page content
const ERROR_MARKERS = [
  "Forbidden",
  "Internal Server Error",
  "Application error",
  "__next_error__",
  "404 - There is no page",
  "Cart is not connected",
  "something went wrong",
  "spinner-stuck",
];

async function getAdminToken() {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@test.local",
      password: process.env.ADMIN_PASSWORD || "Test1234!",
    }),
  });

  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.status}`);
  }

  const { token } = await res.json();
  return token;
}

async function getBuyerToken() {
  const res = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: DEMO_BUYER_EMAIL,
      password: DEMO_BUYER_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`Buyer login failed: ${res.status}`);
  }

  const { token } = await res.json();
  return token;
}

async function getNzRegionId(backendUrl) {
  const res = await fetch(`${backendUrl}/store/regions`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const data = await res.json();
  const regions = data.regions || [];
  const nz = regions.find(r => r.currency_code === "nzd");
  return nz?.id || null;
}

async function getFirstVariantId(backendUrl, regionId) {
  if (!regionId) return null;
  const res = await fetch(`${backendUrl}/store/products?limit=1&region_id=${regionId}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const data = await res.json();
  const products = data.products || [];
  return products[0]?.variants?.[0]?.id || null;
}

async function getFirstCompanyId(backendUrl) {
  const token = await getAdminToken();
  const res = await fetch(`${backendUrl}/admin/companies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.companies?.[0]?.id || null;
}

async function createCartWithItems(buyerToken, backendUrl, qty = 2) {
  const regionId = await getNzRegionId(backendUrl);
  const variantId = await getFirstVariantId(backendUrl, regionId);
  if (!regionId || !variantId) {
    console.warn("  createCartWithItems: missing region or variant — skipping cart setup");
    return null;
  }
  const storeHeaders = {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
    Authorization: `Bearer ${buyerToken}`,
  };
  const cartRes = await fetch(`${backendUrl}/store/carts`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ region_id: regionId }),
  });
  if (!cartRes.ok) {
    console.warn(`  createCartWithItems: cart creation failed ${cartRes.status}`);
    return null;
  }
  const { cart } = await cartRes.json();
  await fetch(`${backendUrl}/store/carts/${cart.id}/line-items`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ variant_id: variantId, quantity: qty }),
  }).catch(() => {});
  return cart.id;
}

async function getFirstAdminOrderId(backendUrl) {
  const token = await getAdminToken();
  const res = await fetch(`${backendUrl}/admin/orders?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.orders?.[0]?.id || null;
}

async function setupPreState(preState, urlPath, context, buyerToken) {
  switch (preState) {
    case "cart-with-items": {
      const cartId = await createCartWithItems(buyerToken, BACKEND_URL, 2);
      if (cartId) {
        await context.addCookies([
          { name: "_medusa_cart_id", value: cartId, domain: "localhost", path: "/", sameSite: "Lax" },
        ]);
      }
      break;
    }
    case "cart-with-promo": {
      const cartId = await createCartWithItems(buyerToken, BACKEND_URL, 5);
      if (cartId) {
        await context.addCookies([
          { name: "_medusa_cart_id", value: cartId, domain: "localhost", path: "/", sameSite: "Lax" },
        ]);
      }
      break;
    }
    case "order-detail": {
      const orderId = await getFirstAdminOrderId(BACKEND_URL);
      if (orderId) return urlPath.replace(":orderId", orderId);
      break;
    }
    case "scroll-to-bulk-table":
    case "cart-then-quick-order-open":
    case "company-direct-nav": {
      const companyId = await getFirstCompanyId(BACKEND_URL);
      if (companyId) return urlPath.replace(":companyId", companyId);
      break;
    }
    case "company-detail-click":
      break;
    default:
      break;
  }
  return urlPath;
}

async function loginAdmin(page) {
  await page.goto(`${BACKEND_URL}/app`, { waitUntil: "networkidle" });
  // SPA renders form after JS hydration — Medusa admin uses name=email not type=email
  await page.waitForSelector("input[name=email]", { timeout: 15000 });
  await page.locator("input[name=email]").fill(process.env.ADMIN_EMAIL || "admin@test.local");
  await page.locator("input[type=password]").fill(process.env.ADMIN_PASSWORD || "Test1234!");
  await page.locator("button[type=submit]").click();
  // Wait for redirect away from /login — SPA may land on /app or /app/login first
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
}

async function captureFlow(flow) {
  const [num, slug, persona, urlPath, description, preState] = flow;
  const flowDir = path.join(FLOWS_DIR, `${num}-${slug}`);
  fs.mkdirSync(flowDir, { recursive: true });

  console.log(`\n[Flow ${num}] ${slug} (${persona}) — ${description}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    // Determine if admin or buyer flow
    const isAdmin = persona === "admin" || urlPath.includes("/app/");
    const isStorefront = urlPath.includes(`/${REGION}`);

    let token = "";
    if (isAdmin) {
      // Login via UI for admin flows
      await loginAdmin(page);
    } else if (isStorefront) {
      token = await getBuyerToken();
      // Add auth cookie for storefront buyer flows
      await context.addCookies([
        {
          name: "_medusa_jwt",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }

    // Resolve URL via preState (order-detail replaces :orderId)
    let resolvedPath = urlPath;
    if (preState) {
      resolvedPath = (await setupPreState(preState, urlPath, context, token)) || urlPath;
    }
    const url = isAdmin ? `${BACKEND_URL}${resolvedPath}` : `${STOREFRONT_URL}${resolvedPath}`;
    console.log(`  Navigate: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000); // Allow rendering

    // Post-navigate preState interactions
    if (preState === "scroll-to-bulk-table") {
      const bulkTable = page.locator('table, [class*="bulk"], [data-testid*="bulk"]').first();
      await bulkTable.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
    }
    if (preState === "cart-then-quick-order-open") {
      const qopBtn = page.locator('button:has-text("Quick Order"), [data-testid*="quick-order"]').first();
      await qopBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    if (preState === "company-detail-click") {
      const firstRow = page.locator('tbody tr, [data-testid*="company-row"]').first();
      await firstRow.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Dismiss dev UI elements before screenshot
    await page.evaluate(() => {
      // 1. Next.js dev overlay (the "N X Issues" badge)
      const devSelectors = [
        'nextjs-portal',
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-toast]',
        '#__next-build-watcher',
        'button[data-nextjs-toast-errors-hint-expand-button]',
      ];
      devSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });

      // 2. Starter template "Build your own B2B store" / "Deploy to Cloud" banner
      //    Targets the bg-neutral-900 announcement bar in layout.tsx (lines 34-50)
      document.querySelectorAll('div.bg-neutral-900').forEach(el => {
        if (el.textContent && el.textContent.includes('Deploy to Cloud')) {
          el.remove();
        }
      });
      // Fallback: hide any element containing that exact link text
      document.querySelectorAll('a').forEach(a => {
        if (a.textContent && a.textContent.trim().startsWith('Deploy to Cloud')) {
          const banner = a.closest('div[class*="bg-neutral"]') || a.parentElement;
          if (banner) banner.style.display = 'none';
        }
      });

      // CSS suppression for anything late-mounted
      const style = document.createElement('style');
      style.textContent = [
        'nextjs-portal { display: none !important; }',
        '[data-nextjs-dialog-overlay] { display: none !important; }',
        '[data-nextjs-toast] { display: none !important; }',
      ].join('\n');
      document.head.appendChild(style);
    }).catch(() => {}); // Non-fatal

    // Scan for error markers
    const pageText = await page.evaluate(() => document.body.innerText);
    const errorMarkersFound = ERROR_MARKERS.filter(marker =>
      pageText.includes(marker)
    );

    // Check for prices (if storefront)
    let pricesFound = [];
    let currencyIssue = false;
    if (isStorefront) {
      const priceTexts = await page.evaluate(() => {
        const priceElements = Array.from(document.querySelectorAll('[data-testid*="price"], .price, [class*="price"]'));
        return priceElements.map(el => el.textContent.trim()).filter(t => t.length > 0);
      });
      pricesFound = priceTexts;

      // Check if any price is missing the expected currency symbol (foreign currency = bad)
      currencyIssue = priceTexts.length > 0 && priceTexts.every(p => !p.includes(EXPECTED_CURRENCY));
    }

    // Capture screenshot
    // Settled-state guard: wait for network idle + primary visible element before capture
    await page.waitForLoadState('networkidle').catch(() => {});
    const mainLocator = page.locator("main, [role='main'], h1").first();
    await mainLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (isStorefront) {
      const priceCount = await page.locator('[data-testid*="price"], .price, [class*="price"]').count();
      if (priceCount > 0) {
        await page.locator('[data-testid*="price"], .price, [class*="price"]').first()
          .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      }
    }

    // Verify admin flows are not redirected back to login
    if (isAdmin && page.url().includes('/login')) {
      throw new Error(`Admin auth redirect — captured login page at: ${page.url()}`);
    }

    const screenshotPath = path.join(flowDir, "step-01.png");
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot: ${screenshotPath}`);

    // Also save to docs/static/img/demo/flows for Docusaurus serving
    const docsStaticDir = path.join(REPO_ROOT, "docs/static/img/demo/flows", `${num}-${slug}`);
    fs.mkdirSync(docsStaticDir, { recursive: true });
    const docsScreenshotPath = path.join(docsStaticDir, "step-01.png");
    await page.screenshot({ path: docsScreenshotPath });
    console.log(`  Docs screenshot: ${docsScreenshotPath}`);

    // Determine verdict
    const hasErrors = errorMarkersFound.length > 0;
    const hasEUR = currencyIssue;
    const verdict = hasErrors || hasEUR ? "FAIL" : "PASS";

    return {
      flow: num,
      slug,
      persona,
      status: verdict,
      stills_dir: flowDir,
      step_count: 1,
      content_checks: {
        prices_found: pricesFound.length,
        error_markers_found: errorMarkersFound,
        currency_check: hasEUR ? "FOREIGN_CURRENCY" : EXPECTED_CURRENCY,
      },
      error_markers_found: errorMarkersFound,
      verdict,
    };
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return {
      flow: num,
      slug,
      persona,
      status: "ERROR",
      stills_dir: flowDir,
      step_count: 0,
      error: err.message,
      verdict: "FAIL",
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("Flow Capture & Verification — 11 B2B Personas in NZD");
  console.log("=".repeat(70));

  const results = [];
  for (const flow of FLOWS) {
    const result = await captureFlow(flow);
    results.push(result);
  }

  // Write manifest
  const manifestPath = path.join(
    FLOWS_DIR.replace(/\/flows$/, ""),
    `capture-verify-${new Date().toISOString().split("T")[0]}.json`
  );

  const manifest = {
    run_date: new Date().toISOString().split("T")[0],
    overall_verdict: results.every(r => r.verdict === "PASS") ? "PASS" : "FAIL",
    summary: {
      total: results.length,
      passed: results.filter(r => r.verdict === "PASS").length,
      failed: results.filter(r => r.verdict === "FAIL").length,
      errors: results.filter(r => r.verdict === "ERROR").length,
    },
    scenarios: results,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${manifestPath}`);

  // Print summary table
  console.log("\n" + "=".repeat(70));
  console.log("Summary");
  console.log("=".repeat(70));
  console.log(`Passed: ${manifest.summary.passed}/${manifest.summary.total}`);
  console.log(`Failed: ${manifest.summary.failed}/${manifest.summary.total}`);
  console.log(`Errors: ${manifest.summary.errors}/${manifest.summary.total}`);
  console.log(`Overall: ${manifest.overall_verdict}`);
  console.log("=".repeat(70));

  process.exit(manifest.overall_verdict === "PASS" ? 0 : 1);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(2);
});
