/**
 * Targeted re-capture for flows 04, 09, 10 after URL fix /nz/cart → /nz/store
 */
import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(REPO_ROOT, "docs/demo/screenshots");
const STILLS_ROOT = path.join(REPO_ROOT, "tmp/Digital-Commerce/demo/flows");
const DATE = new Date().toISOString().slice(0, 10);
const STOREFRONT_URL = "http://localhost:8000";
const REGION = "nz";

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const TARGETS = [
  ["04", "spending-limit", `/${REGION}/store`],
  ["09", "bulk-add", `/${REGION}/store`],
  ["10", "quick-order-pad", `/${REGION}/store`],
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

for (const [num, slug, urlPath] of TARGETS) {
  console.log(`\n[Flow ${num}] ${slug} → ${urlPath}`);
  await page.goto(`${STOREFRONT_URL}${urlPath}`, { waitUntil: "networkidle", timeout: 30000 });

  try {
    await page.waitForSelector('[data-testid="product-wrapper"], .grid a, h3', { timeout: 10000 });
  } catch (_) {}

  const outPath = path.join(SCREENSHOTS_DIR, `${num}-${slug}-${DATE}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  const stat = fs.statSync(outPath);
  console.log(`  Saved: ${outPath} (${Math.round(stat.size / 1024)}K)`);

  const stillsDir = path.join(STILLS_ROOT, `${num}-${slug}`);
  fs.mkdirSync(stillsDir, { recursive: true });
  fs.copyFileSync(outPath, path.join(stillsDir, "step-01.png"));
  console.log(`  Stills: ${stillsDir}/step-01.png`);
}

await browser.close();
console.log("\nDone — 3 flows re-captured.");
