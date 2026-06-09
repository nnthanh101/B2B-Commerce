/**
 * SSO Proof Test — Captures full OIDC round-trip
 *
 * Verifies:
 * 1. Login page loads
 * 2. SSO button click → redirects to Keycloak
 * 3. Keycloak login → authenticates
 * 4. Redirect back to authenticated account page
 */

import { test, expect } from "@playwright/test";
import { STOREFRONT_URL, SCREENSHOTS_DIR } from "./config";
import path from "node:path";
import fs from "node:fs";

const KEYCLOAK_SSO_USER = process.env.KEYCLOAK_SSO_USER || "sso.buyer@demo.com";
const KEYCLOAK_SSO_PASS = process.env.KEYCLOAK_SSO_PASS || "SsoBuyer2026!";

test.describe("SSO Proof — Full OIDC Round-Trip", () => {
  test("A4: Capture SSO login flow (login → Keycloak → authenticated account)", async ({ page }) => {
    // STEP 1: Navigate to login page
    console.log(`\n=== STEP 1: Navigate to login page ===`);
    await page.goto(`${STOREFRONT_URL}/nz/account`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // Wait for SSO button to appear
    const ssoButton = page.locator('[data-testid="sso-login-button"]');
    await ssoButton.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Login page loaded; SSO button found");

    // Capture login page
    const loginScreenshot = path.join(SCREENSHOTS_DIR, "sso-01-login.png");
    await page.screenshot({ path: loginScreenshot, fullPage: false });
    console.log(`✓ Screenshot: sso-01-login.png | URL: ${page.url()}`);

    // STEP 2: Click SSO button and wait for Keycloak redirect
    console.log(`\n=== STEP 2: Click SSO button ===`);
    const isVisible = await ssoButton.isVisible();
    expect(isVisible).toBe(true);
    console.log(`  SSO button visible: ${isVisible}`);

    // Navigate to Keycloak by clicking the SSO button
    const navigationPromise = page.waitForNavigation({
      url: /.*keycloak.*|.*realms\/medusa-commerce.*/,
      timeout: 15000,
    });

    await ssoButton.click();
    console.log("✓ SSO button clicked; waiting for Keycloak redirect...");

    // Wait for navigation
    await navigationPromise.catch((err) => {
      console.warn(`Navigation completed or timed out: ${err.message}`);
    });

    await page.waitForTimeout(1500); // Let page stabilize

    // Verify we're on Keycloak login
    const currentUrl = page.url();
    console.log(`  Current URL after redirect: ${currentUrl}`);
    expect(
      currentUrl.includes("keycloak") || currentUrl.includes("realms/")
    ).toBeTruthy();

    // Capture Keycloak login page
    const keycloakScreenshot = path.join(SCREENSHOTS_DIR, "sso-02-keycloak.png");
    await page.screenshot({ path: keycloakScreenshot, fullPage: false });
    console.log(`✓ Screenshot: sso-02-keycloak.png | URL: ${currentUrl}`);
    console.log("✓ On Keycloak login page");

    // STEP 3: Fill Keycloak login form
    console.log(`\n=== STEP 3: Fill Keycloak login form ===`);

    // Wait for form fields to be available
    await page
      .waitForSelector("#username", { timeout: 5000 })
      .catch(() => {
        console.warn("⚠ #username field not found; searching alternatives...");
      });

    // Fill username
    const usernameInput = page.locator(
      "#username, [name='username'], [placeholder='Username']"
    ).first();
    const passwordInput = page.locator(
      "#password, [name='password'], [placeholder='Password']"
    ).first();

    try {
      await usernameInput.fill(KEYCLOAK_SSO_USER);
      console.log(`✓ Filled username: ${KEYCLOAK_SSO_USER}`);

      await passwordInput.fill(KEYCLOAK_SSO_PASS);
      console.log(`✓ Filled password`);

      // Find and click login button
      const loginButton = page.locator(
        "#kc-login, button[type='submit'], button:has-text('Log In')"
      ).first();
      await loginButton.click();
      console.log("✓ Keycloak login submitted");
    } catch (err) {
      console.error(
        `✗ Failed to fill Keycloak form: ${(err as Error).message}`
      );
      const pageContent = await page.content();
      console.log(
        `  Current page content excerpt: ${pageContent.slice(0, 500)}`
      );

      // Capture failure screenshot
      const failScreenshot = path.join(
        SCREENSHOTS_DIR,
        "sso-FAIL-keycloak-form.png"
      );
      await page.screenshot({ path: failScreenshot, fullPage: false });
      throw err;
    }

    // STEP 4: Wait for redirect back to storefront
    console.log(`\n=== STEP 4: Wait for redirect back to storefront ===`);

    // Wait for redirect back to account page
    await page
      .waitForURL(`**${STOREFRONT_URL}**/account**`, {
        timeout: 15000,
      })
      .catch(() => {
        console.warn("⚠ Timeout waiting for account page redirect");
      });

    await page.waitForTimeout(2000); // Let authenticated page fully load
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);

    // Verify we're authenticated (not back on login)
    const isOnLoginPage = await page
      .locator('[data-testid="sso-login-button"]')
      .isVisible()
      .catch(() => false);

    expect(isOnLoginPage).toBe(false);
    console.log("✓ Not on login page (authentication successful)");

    // Capture authenticated page
    const authenticatedScreenshot = path.join(
      SCREENSHOTS_DIR,
      "sso-03-authenticated.png"
    );
    await page.screenshot({ path: authenticatedScreenshot, fullPage: false });
    console.log(`✓ Screenshot: sso-03-authenticated.png | URL: ${finalUrl}`);
    console.log("✓ Authenticated account page loaded");

    // Assert authenticated content — check for error markers
    const pageText = await page.locator("body").textContent();
    const errorPatterns = [
      "Forbidden",
      "unauthorized",
      "500",
      "Something went wrong",
      "error",
    ];
    const hasError = errorPatterns.some((pattern) =>
      pageText?.toLowerCase().includes(pattern.toLowerCase())
    );

    expect(hasError).toBe(false);
    console.log("✓ No error markers found");

    console.log(`\n=== SSO FLOW COMPLETE ===`);
    console.log(`Final authenticated URL: ${finalUrl}`);
    console.log(
      `Page contains: ${pageText?.slice(0, 200).replace(/\n/g, " ") || "[no text]"}`
    );
  });
});
