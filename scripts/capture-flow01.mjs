/**
 * One-shot capture for flow 01 at /nz/store.
 * Re-run after URL fix: /nz/cart → /nz/store
 */
import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(REPO_ROOT, "docs/demo/screenshots");
const DATE = new Date().toISOString().slice(0, 10);
const STOREFRONT_URL = "http://localhost:8000";

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

console.log("Navigating to /nz/store ...");
await page.goto(`${STOREFRONT_URL}/nz/store`, { waitUntil: "networkidle", timeout: 30000 });

// Wait for product cards to appear
try {
  await page.waitForSelector('[data-testid="product-wrapper"], .grid a, h3', { timeout: 15000 });
} catch (_) {
  console.log("No product selector found — capturing anyway");
}

const outPath = path.join(SCREENSHOTS_DIR, `01-cart-to-quote-${DATE}.png`);
await page.screenshot({ path: outPath, fullPage: false });

const stat = fs.statSync(outPath);
console.log(`Saved: ${outPath} (${Math.round(stat.size / 1024)}K)`);

// Also save to stills dir for batch-demo-video.sh
const stillsDir = path.join(REPO_ROOT, "tmp/Digital-Commerce/demo/flows/01-cart-to-quote");
fs.mkdirSync(stillsDir, { recursive: true });
const stillPath = path.join(stillsDir, "step-01.png");
fs.copyFileSync(outPath, stillPath);
console.log(`Stills copy: ${stillPath}`);

await browser.close();
console.log("Flow 01 capture complete.");
