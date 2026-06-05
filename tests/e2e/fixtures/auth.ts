import { test as base, Page, BrowserContext } from "@playwright/test";

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const MEDUSA_PUBLISHABLE_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY || "pk_89861bb07bbcabb1d2109a6fc402fff21dd6d179887483006e88b5895c100624";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.local";
const TEST_ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD || "Test1234!";

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

    // Admin login to Medusa admin API
    const loginRes = await page.request.post(
      `${MEDUSA_BACKEND_URL}/auth/user/emailpass`,
      {
        data: {
          email: TEST_ADMIN_EMAIL,
          password: TEST_ADMIN_PASSWORD,
        },
      }
    );

    if (!loginRes.ok()) {
      throw new Error(
        `Admin login failed with status ${loginRes.status()}. Ensure TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are set correctly.`
      );
    }

    const { token } = await loginRes.json();

    // Store auth cookie
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

    // Store token in local storage for admin dashboard
    await page.goto(`${MEDUSA_BACKEND_URL}/app`);
    await page.evaluate((token) => {
      localStorage.setItem("auth_token", token);
    }, token);

    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(15000);
    await use(page);
    await page.close();
  },

  buyerContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Customer registration (Medusa backend API with publishable key)
    const registerRes = await page.request.post(
      `${MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`,
      {
        headers: {
          "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
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
          "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
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
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(15000);
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
