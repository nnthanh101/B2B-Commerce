import { test as base, Page, BrowserContext } from "@playwright/test";
import {
  BACKEND_URL,
  STOREFRONT_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  getPublishableKey,
} from "../config";

// For backwards compatibility, keep these aliases for any direct references
const MEDUSA_BACKEND_URL = BACKEND_URL;
const TEST_ADMIN_EMAIL = ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = ADMIN_PASSWORD;

/**
 * Admin context fixture: returns a page with admin authentication.
 * Admin has access to /app (Medusa admin dashboard).
 */
export const test = base.extend<{
  adminContext: BrowserContext;
  adminPage: Page;
  buyerContext: BrowserContext;
  buyerPage: Page;
}>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);

    // Admin login via UI form (same pattern as screenshots.spec.ts adminLogin)
    // This is more reliable than API token + localStorage injection
    await page.goto(`${MEDUSA_BACKEND_URL}/app/login`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for React SPA to hydrate and render the login form
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[id="email"]'
    );
    await emailInput.waitFor({ state: "visible", timeout: 20000 });
    await emailInput.fill(TEST_ADMIN_EMAIL);

    const pwInput = page.locator("input[type=\"password\"], input[name=\"password\"]");
    await pwInput.first().fill(TEST_ADMIN_PASSWORD);

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), button:has-text("Continue")'
    );
    await submitBtn.first().click();

    // Poll until URL leaves login page (navigated to dashboard)
    await page.waitForFunction(
      () => {
        const p = window.location.pathname;
        return (
          p.startsWith("/app") &&
          p !== "/app/login" &&
          !p.startsWith("/app/login")
        );
      },
      { timeout: 20000 }
    );
    await page.waitForLoadState("networkidle");

    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);
    await use(page);
    await page.close();
  },

  buyerContext: async ({ browser }, use) => {
    // Enable video recording for buyer context (1280x720 resolution)
    const context = await browser.newContext({
      recordVideo: {
        dir: "./tmp/Digital-Commerce/test-results/videos",
        size: { width: 1280, height: 720 },
      },
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Resolve publishable key from config (backend)
    const publishableKey = await getPublishableKey();

    // Customer registration (Medusa backend API with publishable key)
    const registerRes = await page.request.post(
      `${MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`,
      {
        headers: {
          "x-publishable-api-key": publishableKey,
        },
        data: {
          email: "buyer@oceansoft.test",
          password: "BuyerPassword123!",
        },
      }
    );

    if (!registerRes.ok()) {
      console.warn(
        `Buyer registration returned ${registerRes.status()} — may already exist`
      );
    }

    // Customer login (Medusa backend API with publishable key)
    const loginRes = await page.request.post(
      `${MEDUSA_BACKEND_URL}/auth/customer/emailpass`,
      {
        headers: {
          "x-publishable-api-key": publishableKey,
        },
        data: {
          email: "buyer@oceansoft.test",
          password: "BuyerPassword123!",
        },
      }
    );

    if (!loginRes.ok()) {
      throw new Error(
        `Buyer login failed with status ${loginRes.status()}`
      );
    }

    const { token } = await loginRes.json();

    // Store auth in context
    await context.addCookies([
      {
        name: "auth_token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Store in local storage
    await page.goto(STOREFRONT_URL);
    await page.evaluate((token) => {
      localStorage.setItem("customer_token", token);
    }, token);

    await use(context);
    await context.close();
  },

  buyerPage: async ({ buyerContext }, use) => {
    const page = await buyerContext.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
