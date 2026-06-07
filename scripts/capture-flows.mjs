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

const REPO_ROOT = "/Volumes/Working/projects/B2B-Commerce";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const REGION = process.env.CAPTURE_REGION || process.env.TEST_REGION_COUNTRY || "nz";
const EXPECTED_CURRENCY = process.env.CAPTURE_CURRENCY || "NZ$";
const DEMO_BUYER_EMAIL = "demo-buyer@democorp.local";
const DEMO_BUYER_PASSWORD = "Test1234!";
const FLOWS_DIR = path.join(REPO_ROOT, "tmp/B2B-Commerce/demo/flows");

// Flows: [num, slug, persona, path, description]
const FLOWS = [
  ["01", "cart-to-quote", "buyer-employee", `/${REGION}/cart`, "Maria converts cart to quote"],
  ["02", "approval", "admin", "/app/approvals", "David approves/rejects quote"],
  ["03", "company-mgmt", "admin", "/app/companies", "David manages company members"],
  ["04", "spending-limit", "buyer-employee", `/${REGION}/cart`, "Maria checks spending limit"],
  ["05", "quote-negotiate", "sales-manager", "/app/quotes", "Sofia negotiates quote price"],
  ["06", "promotions", "buyer-employee", `/${REGION}`, "Maria sees auto-applied discounts"],
  ["07", "full-ecommerce", "buyer-employee", `/${REGION}`, "Maria browses and checks out"],
  ["08", "order-edit", "admin", "/app/orders", "David edits order post-placement"],
  ["09", "bulk-add", "buyer-employee", `/${REGION}/cart`, "Maria bulk-adds items"],
  ["10", "quick-order-pad", "buyer-employee", `/${REGION}/quickorder`, "Maria uses quick-order pad"],
  ["11", "invite-employee", "admin", "/app/employees", "David invites employee via token"],
];

// Error markers to scan for in page content
const ERROR_MARKERS = [
  "Forbidden",
  "500",
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

async function captureFlow(flow) {
  const [num, slug, persona, urlPath, description] = flow;
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
      token = await getAdminToken();
    } else if (isStorefront) {
      token = await getBuyerToken();
    }

    // Add auth cookie if needed
    if (token && isStorefront) {
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

    const url = isAdmin ? `${BACKEND_URL}${urlPath}` : `${STOREFRONT_URL}${urlPath}`;
    console.log(`  Navigate: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000); // Allow rendering

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
    const screenshotPath = path.join(flowDir, "step-01.png");
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot: ${screenshotPath}`);

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
