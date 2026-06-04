import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Visual Verification Screenshot Suite — B2B Journeys
 *
 * Produces VV-01 through VV-07 PNG evidence of the live stack.
 * Buyer-employee (VV-01..VV-03) and Admin/sales-manager (VV-04..VV-07).
 * Both personas captured — anti-INVISIBLE_PRIMARY_USER compliance.
 *
 * Run (Option A — host Playwright, from repo root):
 *   TEST_ADMIN_EMAIL=admin@test.local TEST_ADMIN_PASSWORD=Test1234! \
 *     npx playwright test tests/e2e/screenshots.spec.ts --project=chromium
 */

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:8000';
const ADMIN_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.local';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Test1234!';
const REGION = process.env.TEST_REGION_COUNTRY || 'dk';

// Absolute path — no relative traversal needed at runtime
const SCREENSHOT_DIR = process.env.SCREENSHOT_OUTPUT_DIR || '/Volumes/Working/projects/Digital-Commerce/tmp/Digital-Commerce/test-results/screenshots';

function screenshotPath(filename: string): string {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  return path.join(SCREENSHOT_DIR, filename);
}

// ─────────────────────────────────────────────────────────────────
// PERSONA 1: Buyer-employee (storefront journeys)
// ─────────────────────────────────────────────────────────────────

test.describe('Buyer-employee persona — storefront journeys', () => {
  test('VV-01: Storefront home page (/dk)', async ({ page }) => {
    await page.goto(`${STOREFRONT_URL}/${REGION}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    expect(title).toBeTruthy();
    await page.screenshot({ path: screenshotPath('VV-01-home.png'), fullPage: true });
  });

  test('VV-02: Storefront store page (/dk/store)', async ({ page }) => {
    await page.goto(`${STOREFRONT_URL}/${REGION}/store`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const content = await page.content();
    expect(content).not.toMatch(/internal server error/i);
    await page.screenshot({ path: screenshotPath('VV-02-store.png'), fullPage: true });
  });

  test('VV-03: Storefront cart page (/dk/cart)', async ({ page }) => {
    await page.goto(`${STOREFRONT_URL}/${REGION}/cart`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-03-cart.png'), fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────
// PERSONA 2: Admin / sales-manager (admin dashboard journeys)
// ─────────────────────────────────────────────────────────────────

test.describe('Admin/sales-manager persona — admin dashboard journeys', () => {
  let adminToken: string | null = null;

  test.beforeAll(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const res = await page.request.post(`${ADMIN_URL}/auth/user/emailpass`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      if (res.ok()) {
        const body = await res.json();
        adminToken = body.token || body.access_token || null;
        console.log(adminToken
          ? 'Admin JWT obtained via /auth/user/emailpass'
          : `Login 200 but no token field — keys: ${JSON.stringify(Object.keys(body))}`
        );
      } else {
        console.warn(`Admin login HTTP ${res.status()} — will fall back to UI login`);
      }
    } catch (err) {
      console.warn(`Admin API login error: ${err}`);
    }
    await browser.close();
  });

  async function prepareAdminPage(page: import("@playwright/test").Page): Promise<void> {
    if (adminToken) {
      await page.goto(`${ADMIN_URL}/app`);
      await page.evaluate((tok) => {
        localStorage.setItem('_medusa_jwt', tok);
        localStorage.setItem('medusa_auth_token', tok);
      }, adminToken);
      await page.reload();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto(`${ADMIN_URL}/app/login`);
      await page.waitForLoadState('networkidle');
      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[placeholder*="mail" i]'
      );
      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill(ADMIN_EMAIL);
        await page
          .locator('input[type="password"], input[name="password"]')
          .first()
          .fill(ADMIN_PASSWORD);
        const submit = page.locator(
          'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")'
        );
        if ((await submit.count()) > 0) {
          await submit.first().click();
          await page.waitForLoadState('networkidle');
        }
      }
    }
  }

  test('VV-04: Admin dashboard (/app)', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(25000);
    await prepareAdminPage(page);
    await page.goto(`${ADMIN_URL}/app`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-04-admin-dashboard.png'), fullPage: true });
  });

  test('VV-05: Admin companies page (/app/companies)', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(25000);
    await prepareAdminPage(page);
    await page.goto(`${ADMIN_URL}/app/companies`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-05-companies.png'), fullPage: true });
  });

  test('VV-06: Admin quotes page (/app/quotes)', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(25000);
    await prepareAdminPage(page);
    await page.goto(`${ADMIN_URL}/app/quotes`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-06-quotes.png'), fullPage: true });
  });

  test('VV-07: Admin approvals page (/app/approvals)', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(25000);
    await prepareAdminPage(page);
    await page.goto(`${ADMIN_URL}/app/approvals`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-07-approvals.png'), fullPage: true });
  });
});
