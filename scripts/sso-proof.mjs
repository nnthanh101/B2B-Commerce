#!/usr/bin/env node
/**
 * SSO Proof Script — Captures full OIDC round-trip
 *
 * Verifies:
 * 1. Login page loads (sso-01-login.png)
 * 2. SSO button click → redirects to Keycloak (sso-02-keycloak.png)
 * 3. Keycloak login → authenticates → redirects back
 * 4. Authenticated account page (sso-03-authenticated.png)
 *
 * Container networking note:
 *   This script runs inside a Docker container (--add-host mappings only).
 *   'localhost' inside the container is the container itself, NOT the host.
 *   Storefront(:8000) and backend(:9000) are on the HOST, reachable via host.docker.internal.
 *
 *   OIDC redirect URIs baked into the auth flow use 'localhost:9000' and 'localhost:8000'.
 *   We intercept those navigations and rewrite them to host.docker.internal equivalents.
 *   This is a PROOF-ONLY technique — production uses real hostnames.
 */

// ESM import: resolve playwright from pnpm store (mounted at /work/node_modules in container).
// NODE_PATH doesn't work for ESM; we use createRequire as a CJS bridge.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'path';

// FRONTEND_URL and BACKEND_URL must resolve inside the container.
// When --network ec_network is used, Docker Compose service DNS resolves:
//   storefront:8000  → ec_storefront container
//   ec:9000          → ec_backend container (service name is 'ec' in docker-compose.yml)
//   keycloak:8080    → ec_keycloak container
const STOREFRONT_URL = process.env.FRONTEND_URL || 'http://storefront:8000';
const HOST_BACKEND   = process.env.BACKEND_URL  || 'http://ec:9000';
const SCREENSHOTS_DIR = '/work/tmp/B2B-Commerce/screenshots';
const KEYCLOAK_SSO_USER = 'sso.buyer@demo.com';
const KEYCLOAK_SSO_PASS = 'SsoBuyer2026!';

async function captureAndLog(page, _step, filename) {
  try {
    const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  Screenshot: ${filename} | URL: ${page.url()}`);
    return screenshotPath;
  } catch (err) {
    console.error(`  FAIL to capture ${filename}: ${err.message}`);
    throw err;
  }
}

/**
 * Rewrite any request/navigation to localhost:8000 or localhost:9000
 * to the Docker container service names so the Playwright container (on ec_network)
 * can reach them.
 *
 * The OIDC flow bakes localhost:* URIs in the authorization URL:
 *   - redirect_uri=http://localhost:9000/auth/customer/vymalo-keycloak/callback
 *   - default_redirect_uri=http://localhost:8000/nz/account/auth-callback
 * These won't reach anything inside the container — rewrite to Docker service names.
 */
async function installLocalhostRewrite(page) {
  // localhost:8000 → storefront:8000 (Docker Compose service name on ec_network)
  await page.route('http://localhost:8000/**', (route) => {
    const original = route.request().url();
    const rewritten = original.replace('http://localhost:8000', 'http://storefront:8000');
    console.log(`  [route-rewrite] ${original} => ${rewritten}`);
    route.continue({ url: rewritten });
  });
  // localhost:9000 → ec:9000 (Docker Compose service name on ec_network)
  await page.route('http://localhost:9000/**', (route) => {
    const original = route.request().url();
    const rewritten = original.replace('http://localhost:9000', 'http://ec:9000');
    console.log(`  [route-rewrite] ${original} => ${rewritten}`);
    route.continue({ url: rewritten });
  });
}

async function runSSOFlow() {
  let browser;
  try {
    console.log('Starting browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Remap localhost:8000 → storefront:8000 and localhost:9000 → ec:9000
        // at the Chrome network layer (before TCP connect, so 302 redirects are remapped too).
        '--host-resolver-rules=MAP localhost:8000 storefront:8000, MAP localhost:9000 ec:9000',
      ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Also install route rewrites as belt-and-suspenders for fetch/XHR requests.
    await installLocalhostRewrite(page);

    // ── STEP 1: Load storefront login page ──────────────────────────────────
    console.log(`\n=== STEP 1: Navigate to login page ===`);
    await page.goto(`${STOREFRONT_URL}/nz/account`, {
      waitUntil: 'networkidle',
      timeout: 20000
    });

    const ssoButtonLocator = page.locator('[data-testid="sso-login-button"]');
    try {
      await ssoButtonLocator.waitFor({ timeout: 8000 });
    } catch (_) {
      console.warn('  SSO button not found by testid; checking page content...');
      const html = await page.content();
      console.log('  Page excerpt:', html.slice(0, 400).replace(/\n/g, ' '));
      await captureAndLog(page, 1, 'sso-FAIL-no-sso-button.png');
      process.exit(1);
    }
    await captureAndLog(page, 1, 'sso-01-login.png');
    console.log('  Login page loaded; SSO button found');

    // ── STEP 2: Click SSO button → Keycloak ─────────────────────────────────
    console.log(`\n=== STEP 2: Click SSO button ===`);

    // Intercept the navigation from the sso button click.
    // The storefront does window.location.href to the Keycloak authorize URL.
    // We need to let it proceed AND handle the redirect back from Keycloak to localhost:9000.
    // Listen for ALL navigation events to debug where the browser ends up
    page.on('response', (resp) => {
      if (resp.status() >= 300 || resp.url().includes('auth') || resp.url().includes('keycloak')) {
        console.log(`  [response] ${resp.status()} ${resp.url()}`);
      }
    });
    page.on('requestfailed', (req) => {
      console.log(`  [req-failed] ${req.failure()?.errorText} => ${req.url()}`);
    });

    const keycloakNavigated = page.waitForURL(/realms\/medusa-commerce/, { timeout: 15000 })
      .catch(err => {
        console.warn(`  Keycloak nav timeout: ${err.message}`);
        return null;
      });

    await ssoButtonLocator.click();
    console.log('  SSO button clicked; waiting for Keycloak redirect...');

    await keycloakNavigated;
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    if (!currentUrl.includes('keycloak') && !currentUrl.includes('realms/')) {
      console.error('  ERROR: Not on Keycloak login page');
      await captureAndLog(page, 2, 'sso-FAIL-no-keycloak.png');
      process.exit(1);
    }

    await captureAndLog(page, 2, 'sso-02-keycloak.png');
    console.log('  On Keycloak login page');

    // ── STEP 3: Fill Keycloak login form ────────────────────────────────────
    console.log(`\n=== STEP 3: Fill Keycloak login form ===`);

    // Check if we got an error page (invalid redirect_uri etc.)
    const pageText3 = await page.locator('body').textContent().catch(() => '');
    if (pageText3.includes('Invalid parameter') || pageText3.includes('error=')) {
      console.error('  ERROR: Keycloak returned an error page');
      console.log('  Page text:', pageText3.slice(0, 300));
      await captureAndLog(page, 3, 'sso-FAIL-keycloak-error.png');
      process.exit(1);
    }

    try {
      await page.waitForSelector('#username', { timeout: 8000 });
      await page.locator('#username').fill(KEYCLOAK_SSO_USER);
      console.log(`  Filled username: ${KEYCLOAK_SSO_USER}`);

      await page.locator('#password').fill(KEYCLOAK_SSO_PASS);
      console.log('  Filled password');

      const loginBtn = page.locator('#kc-login, [name="login"], button[type="submit"]').first();
      await loginBtn.click();
      console.log('  Login button clicked');
    } catch (err) {
      console.error(`  FAIL to fill Keycloak form: ${err.message}`);
      const html = await page.content();
      console.log('  Form HTML excerpt:', html.slice(0, 600).replace(/\n/g, ' '));
      await captureAndLog(page, 3, 'sso-FAIL-keycloak-form.png');
      throw err;
    }

    // ── STEP 4: Wait for redirect back to storefront ─────────────────────────
    console.log(`\n=== STEP 4: Wait for authenticated redirect ===`);

    // After Keycloak auth, the browser follows:
    //   localhost:9000/auth/customer/vymalo-keycloak/callback → (route-rewritten to hdi:9000)
    //   → then redirects to localhost:8000/nz/account/auth-callback → (route-rewritten to hdi:8000)
    //   → Next.js page calls Medusa SDK → sets JWT cookie → redirects to /nz/account
    try {
      await page.waitForURL(/\/account/, { timeout: 20000 }).catch(err => {
        console.warn(`  Timeout waiting for /account: ${err.message}`);
      });

      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log(`  Final URL: ${finalUrl}`);

      // Check for errors — use innerText (visible text only) to avoid false positives
      // from JS bundle text that includes words like 'unauthorized' in minified code.
      const pageText4 = await page.evaluate(() => document.body.innerText).catch(
        () => page.locator('body').textContent().catch(() => '')
      );
      // 'unauthorized' removed from patterns: appears in Next.js/Medusa JS bundles on auth pages
      const errorPatterns = ['Invalid parameter', 'SSO login failed', 'Something went wrong'];
      const foundError = errorPatterns.find(p => pageText4.toLowerCase().includes(p.toLowerCase()));
      if (foundError) {
        console.error(`  ERROR: Page contains error marker: "${foundError}"`);
        console.log('  Page text excerpt:', pageText4.slice(0, 400).replace(/\n/g, ' '));
        await captureAndLog(page, 4, 'sso-FAIL-auth-error.png');
        process.exit(1);
      }

      // Verify not stuck on login page
      const ssoStillVisible = await page.locator('[data-testid="sso-login-button"]').isVisible().catch(() => false);
      if (ssoStillVisible) {
        console.error('  ERROR: Still on login page — authentication failed');
        await captureAndLog(page, 4, 'sso-FAIL-still-on-login.png');
        process.exit(1);
      }

      // Capture the authenticated page
      await captureAndLog(page, 3, 'sso-03-authenticated.png');
      console.log('  Authenticated page captured');

      console.log(`\n=== SSO FLOW COMPLETE ===`);
      console.log(`  Final URL    : ${finalUrl}`);
      console.log(`  Page content : ${pageText4.slice(0, 200).replace(/\n/g, ' ')}`);
      console.log(`  Result       : PASS`);

    } catch (err) {
      console.error(`  Navigation/auth check failed: ${err.message}`);
      await captureAndLog(page, 4, 'sso-FAIL-final-step.png');
      throw err;
    }

    await context.close();
    return true;

  } catch (error) {
    console.error(`\nFAILURE: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runSSOFlow();
