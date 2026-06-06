import { test as base, Page, BrowserContext } from "@playwright/test";
import {
  BACKEND_URL,
  STOREFRONT_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TEST_REGION_COUNTRY,
  getPublishableKey,
} from "../config";
import { setCartIdCookie } from "./cart";

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

    // CRITICAL: Dual-path admin authentication:
    // 1. UI login to `/app` (admin dashboard) — establishes browser session
    // 2. API login to `/auth/customer/emailpass` — gets JWT for `/store/invites` endpoint
    //
    // Why: The `/app` dashboard is admin-specific (UI login creates httpOnly cookies).
    // The `/store/invites` endpoint requires customer auth (JWT in Authorization header).
    // The seeded admin is also a customer (see seed-demo-b2b.ts L213-267).

    // STEP 1: Admin UI login for /app dashboard access
    console.log("[auth] Step 1: Admin UI login to /app dashboard...");

    await page.goto(`${MEDUSA_BACKEND_URL}/app/login`);
    await page.waitForLoadState("domcontentloaded");

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
    await page.waitForLoadState("networkidle").catch(() => {
      // Network timeout is OK — page may still be usable
    });
    console.log("[auth] ✓ Step 1: Admin dashboard authenticated");

    // STEP 2: API login to get customer JWT for /store/invites
    console.log("[auth] Step 2: Admin customer API login for /store/invites...");

    const customerLoginRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      }),
    });

    if (!customerLoginRes.ok) {
      const errText = await customerLoginRes.text();
      throw new Error(
        `[auth] Admin customer API login failed: ${customerLoginRes.status} ${errText}. ` +
        `The admin user (${TEST_ADMIN_EMAIL}) must be seeded as a CUSTOMER with employee/company link.`
      );
    }

    const { token: adminCustomerToken } = (await customerLoginRes.json()) as { token: string };
    console.log(`[auth] ✓ Step 2: Customer token obtained: ${adminCustomerToken.substring(0, 20)}...`);

    // Add the customer JWT token as a cookie so tests can extract it via adminContext.cookies()
    await context.addCookies([
      {
        name: "_medusa_jwt",
        value: adminCustomerToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Step 2: Customer JWT cookie added to context`);

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
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);

    // Resolve publishable key from config (backend)
    let publishableKey: string;
    try {
      publishableKey = await getPublishableKey();
      if (!publishableKey) {
        throw new Error("getPublishableKey() returned empty string");
      }
      console.log(`[auth] ✓ Publishable key resolved: ${publishableKey.substring(0, 20)}...`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[auth] ✗ Failed to resolve publishable key: ${errMsg}`);
      throw new Error(`[auth] Cannot proceed without publishable key: ${errMsg}`);
    }

    // Step 1: Use the demo buyer that's already seeded in the system
    const DEMO_BUYER_EMAIL = "demo-buyer@democorp.local";
    const DEMO_BUYER_PASSWORD = "Test1234!";
    const TEST_REGION_COUNTRY = process.env.TEST_REGION_COUNTRY || "nz";

    // Step 2: API-based registration + customer record creation + login (3-phase auth flow)
    // CRITICAL FIX: In Medusa v2, /auth/customer/emailpass/register creates an AUTH IDENTITY
    // but NOT a customer record. We must explicitly create the customer record before login
    // so that /store/customers/me returns customer data (needed for button visibility).
    console.log(`[auth] Starting buyer auth flow: ${DEMO_BUYER_EMAIL}`);

    let customerToken: string;

    // Phase 1: Attempt login first (buyer may already exist)
    let loginRes = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_BUYER_EMAIL,
        password: DEMO_BUYER_PASSWORD,
      }),
    });

    // Phase 2: If login fails, register the auth identity first
    if (!loginRes.ok) {
      console.log(
        `[auth] Buyer not found (${loginRes.status}); registering auth identity...`
      );

      const registerRes = await fetch(
        `${BACKEND_URL}/auth/customer/emailpass/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: DEMO_BUYER_EMAIL,
            password: DEMO_BUYER_PASSWORD,
          }),
        }
      );

      if (!registerRes.ok) {
        const errText = await registerRes.text();
        throw new Error(
          `[auth] Registration failed: ${registerRes.status} ${errText}`
        );
      }

      console.log(`[auth] ✓ Auth identity created`);

      // Phase 2b: Create customer record immediately after registration
      // Get the registration token (has empty actor_id initially)
      const registerData = (await registerRes.json()) as { token: string };
      const registerToken = registerData.token;

      console.log(
        `[auth] Creating customer record (with registration token)...`
      );

      const createCustomerRes = await fetch(
        `${BACKEND_URL}/store/customers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${registerToken}`,
            "x-publishable-api-key": publishableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: DEMO_BUYER_EMAIL,
            first_name: "Demo",
            last_name: "Buyer",
          }),
        }
      );

      if (!createCustomerRes.ok) {
        const errText = await createCustomerRes.text();
        throw new Error(
          `[auth] Customer record creation failed: ${createCustomerRes.status} ${errText}`
        );
      }

      console.log(`[auth] ✓ Customer record created`);

      // Phase 3: Re-login now that customer record exists
      // The new JWT will have actor_id populated (critical for /store/customers/me)
      loginRes = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DEMO_BUYER_EMAIL,
          password: DEMO_BUYER_PASSWORD,
        }),
      });

      if (!loginRes.ok) {
        const errText = await loginRes.text();
        throw new Error(
          `[auth] Login after registration failed: ${loginRes.status} ${errText}`
        );
      }
    }

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`[auth] buyer login failed: ${loginRes.status} ${errText}`);
    }

    const loginData = (await loginRes.json()) as { token: string };
    customerToken = loginData.token;
    console.log(
      `[auth] ✓ Login successful; token=${customerToken.substring(0, 20)}...`
    );

    // CRITICAL: Capture the FINAL re-login token (T_final)
    // This is the token with actor_id populated that will hydrate SSR
    const T_final = customerToken;

    // Step 4: Navigate to storefront root FIRST to establish the domain context
    // This MUST happen before addCookies() can set httpOnly cookies
    console.log(`[auth] Establishing domain context by navigating to storefront...`);
    await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded" });

    // Step 5: Add the JWT cookie to the context
    // Now that we've navigated to the domain, we can set httpOnly cookies
    console.log(`[auth] Adding _medusa_jwt cookie to context...`);
    await context.addCookies([
      {
        name: "_medusa_jwt",
        value: T_final,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Cookie added: ${T_final.substring(0, 20)}...`);

    // Step 6: Navigate to /account and verify SSR hydration (dashboard should render with authenticated markers)
    // Now the cookie will be sent on this request
    console.log(`[auth] Navigating to /account with cookie to verify hydration...`);
    await page.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/account`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // Verify the dashboard loaded (authenticated marker = "Log out" button or "Profile" link)
    const authenticatedMarker = page.locator("button:has-text('Log out')")
      .or(page.locator("a:has-text('Profile')"))
      .or(page.locator("a:has-text('Orders')"));

    const isAuthenticated = await authenticatedMarker.first().isVisible().catch(() => false);

    if (!isAuthenticated) {
      // If markers not found, check if login form is present (sign of failed hydration)
      const loginForm = page.locator("input[type='email'], input[name='email']");
      const hasLoginForm = await loginForm.first().isVisible().catch(() => false);

      if (hasLoginForm) {
        throw new Error(
          `[auth] SSR hydration FAILED — page shows login form instead of authenticated dashboard. ` +
          `Token=${T_final.substring(0, 20)}... may be stale or cookie not sent on first request.`
        );
      }
    }

    console.log(`[auth] ✓ SSR hydration verified — dashboard accessible`);

    // Verify customer record exists via API (final confirmation)
    console.log(`[auth] Verifying customer record exists...`);
    const meRes = await fetch(`${BACKEND_URL}/store/customers/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${T_final}`,
        "x-publishable-api-key": publishableKey,
        "Content-Type": "application/json",
      },
    });

    if (!meRes.ok) {
      const errText = await meRes.text();
      throw new Error(
        `[auth] /store/customers/me failed: ${meRes.status} ${errText}. Token may not have actor_id.`
      );
    }

    const meData = (await meRes.json()) as { customer?: { id: string } };
    if (meData.customer?.id) {
      console.log(`[auth] ✓ Customer record confirmed: ${meData.customer.id}`);
    } else {
      throw new Error(`[auth] /store/customers/me returned no customer record`);
    }

    // Step 7: Set up request interceptor to inject Authorization header (fallback for API-only calls)
    // This ensures API calls have the JWT even if cookie transport fails
    console.log(`[auth] Setting up request interceptor for API auth...`);
    await context.route("**/*", (route) => {
      const request = route.request();
      const headers = { ...request.headers() };

      // Inject Authorization header for API requests (fallback)
      if (!headers.authorization) {
        headers.authorization = `Bearer ${T_final}`;
      }

      // Inject publishable key header for store API calls
      if (!headers["x-publishable-api-key"]) {
        headers["x-publishable-api-key"] = publishableKey;
      }

      route.continue({ headers });
    });

    // Step 8: Build a cart with line item and set the _medusa_cart_id cookie
    // This ensures the buyer context has both JWT + cart preloaded
    console.log(`[auth] Building buyer cart with line item...`);
    let cartId: string;
    try {
      // Resolve the first available region (country-agnostic: TEST_REGION_COUNTRY may
      // default to "nz" but the seeded store may only have "dk" or another region).
      // Using the first region avoids the cart.ts resolveRegionUuid() country-filter mismatch.
      const regionsRes = await fetch(`${BACKEND_URL}/store/regions`, {
        headers: { "x-publishable-api-key": publishableKey },
      });
      if (!regionsRes.ok) {
        throw new Error(`Failed to fetch regions: ${regionsRes.status}`);
      }
      const regionsData = (await regionsRes.json()) as {
        regions?: Array<{ id: string; countries?: Array<{ iso_2: string }> }>;
      };
      // Find region matching TEST_REGION_COUNTRY (nz) by iso_2 field
      const targetRegion = regionsData.regions?.find((r) =>
        r.countries?.some((c) => c.iso_2 === TEST_REGION_COUNTRY)
      );
      const regionId = targetRegion?.id || regionsData.regions?.[0]?.id;
      if (!regionId) {
        throw new Error("No regions found in store — cannot create cart");
      }
      const regionMsg = targetRegion ? `matching ${TEST_REGION_COUNTRY}` : "(first available fallback)";
      console.log(`[auth] ✓ Region resolved ${regionMsg}: ${regionId}`);

      // Get first available variant from products
      const productsRes = await fetch(
        `${BACKEND_URL}/store/products?limit=1&fields=*variants`,
        {
          headers: {
            "x-publishable-api-key": publishableKey,
          },
        }
      );

      if (!productsRes.ok) {
        throw new Error(`Failed to fetch products: ${productsRes.status}`);
      }

      const productsData = (await productsRes.json()) as {
        products?: Array<{ variants?: Array<{ id: string }> }>;
      };

      const firstVariant = productsData.products?.[0]?.variants?.[0];
      if (!firstVariant?.id) {
        throw new Error("No product variants available to add to cart");
      }

      // Create cart directly with the resolved region_id (bypasses cart.ts resolveRegionUuid
      // which filters by TEST_REGION_COUNTRY and fails when that env var doesn't match seeded data)
      const createCartRes = await context.request.post(`${BACKEND_URL}/store/carts`, {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        data: { region_id: regionId },
      });
      if (!createCartRes.ok()) {
        const errText = await createCartRes.text();
        throw new Error(`POST /store/carts failed: ${createCartRes.status()} ${errText}`);
      }
      const cartData = (await createCartRes.json()) as { cart?: { id: string } };
      cartId = cartData.cart?.id ?? "";
      if (!cartId) {
        throw new Error("No cart ID returned from POST /store/carts");
      }
      console.log(`[auth] ✓ Cart created: ${cartId}`);

      // Add line item
      const addLineRes = await context.request.post(
        `${BACKEND_URL}/store/carts/${cartId}/line-items`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": publishableKey,
          },
          data: { variant_id: firstVariant.id, quantity: 1 },
        }
      );
      if (!addLineRes.ok()) {
        const errText = await addLineRes.text();
        throw new Error(`POST /store/carts/${cartId}/line-items failed: ${addLineRes.status()} ${errText}`);
      }
      const lineData = (await addLineRes.json()) as { cart?: { items?: unknown[] } };
      const itemCount = lineData.cart?.items?.length ?? 0;
      if (itemCount === 0) {
        throw new Error("Line item was not added (items array empty after POST)");
      }
      console.log(`[auth] ✓ Line item added. Cart now has ${itemCount} item(s).`);

      // Set the _medusa_cart_id cookie
      await setCartIdCookie(context, cartId, STOREFRONT_URL);

      console.log(`[auth] ✓ Cart created and cookie set: ${cartId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // FAIL-FAST: cart population is required for buyerContext.
      // summary.tsx:26 returns null when cart is empty, hiding the Request Quote button.
      // Any failure here must surface immediately so the test fails with a clear error,
      // not a cryptic "button not visible" timeout 5s down the line.
      throw new Error(`[auth] Cart population FAILED (required for buyerPage): ${errMsg}`);
    }

    console.log(`[auth] ✓ Buyer context ready: SSR-hydrated via _medusa_jwt cookie + _medusa_cart_id cookie + API interceptor`);

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
