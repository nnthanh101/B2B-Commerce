import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Visual Verification Screenshot Suite — B2B Journeys
 *
 * Produces VV-01 through VV-07 PNG evidence of the live stack.
 * Buyer-employee (VV-01..VV-03) + Admin/sales-manager (VV-04..VV-07).
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

// Absolute path — avoids relative traversal at runtime
const SCREENSHOT_DIR = process.env.SCREENSHOT_OUTPUT_DIR ||
  '/Volumes/Working/projects/Digital-Commerce/tmp/Digital-Commerce/test-results/screenshots';

function screenshotPath(filename: string): string {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  return path.join(SCREENSHOT_DIR, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 1: Buyer-employee (storefront journeys)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 2: Admin / sales-manager (admin dashboard journeys)
// Uses UI form login — most reliable against React SPA localStorage timing.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin/sales-manager persona — admin dashboard journeys', () => {

  /**
   * Log in via the Medusa admin UI form.
   * After submit, wait for the URL to leave /app/login (dashboard loaded).
   */
  async function adminLogin(page: import('@playwright/test').Page): Promise<void> {
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);

    await page.goto(`${ADMIN_URL}/app/login`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for React SPA to hydrate and render the login form
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[id="email"]'
    );
    await emailInput.waitFor({ state: 'visible', timeout: 20000 });
    await emailInput.fill(ADMIN_EMAIL);

    const pwInput = page.locator('input[type="password"], input[name="password"]');
    await pwInput.first().fill(ADMIN_PASSWORD);

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), button:has-text("Continue")'
    );
    await submitBtn.first().click();

    // Poll until URL leaves login page (navigated to dashboard)
    await page.waitForFunction(
      () => {
        const p = window.location.pathname;
        return p.startsWith('/app') && p !== '/app/login' && !p.startsWith('/app/login');
      },
      { timeout: 20000 }
    );
    await page.waitForLoadState('networkidle');
  }

  test('VV-04: Admin dashboard (/app)', async ({ page }) => {
    await adminLogin(page);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-04-admin-dashboard.png'), fullPage: true });
  });

  test('VV-05: Admin companies page (/app/companies)', async ({ page }) => {
    await adminLogin(page);
    await page.goto(`${ADMIN_URL}/app/companies`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-05-companies.png'), fullPage: true });
  });

  test('VV-06: Admin quotes page (/app/quotes)', async ({ page }) => {
    await adminLogin(page);
    await page.goto(`${ADMIN_URL}/app/quotes`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-06-quotes.png'), fullPage: true });
  });

  test('VV-07: Admin approvals page (/app/approvals)', async ({ page }) => {
    await adminLogin(page);
    await page.goto(`${ADMIN_URL}/app/approvals`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: screenshotPath('VV-07-approvals.png'), fullPage: true });
  });
});
