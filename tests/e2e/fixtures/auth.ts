import { test as base, Page, BrowserContext } from "@playwright/test";
import {
  BACKEND_URL,
  STOREFRONT_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TEST_REGION_COUNTRY as CONFIG_TEST_REGION_COUNTRY,
  getPublishableKey,
} from "../config";
import { setCartIdCookie } from "./cart";

// For backwards compatibility, keep these aliases for any direct references
const MEDUSA_BACKEND_URL = BACKEND_URL;
const TEST_ADMIN_EMAIL = ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = ADMIN_PASSWORD;

// Resolve cookie domain from STOREFRONT_URL (supports host.docker.internal and localhost)
// When running container-first (STOREFRONT_URL=http://host.docker.internal:8000),
// the cookie domain must be "host.docker.internal" not "localhost" for the browser to send it.
const COOKIE_DOMAIN = (() => {
  try {
    return new URL(STOREFRONT_URL).hostname;
  } catch {
    return "localhost";
  }
})();

/**
 * Admin context fixture: returns a page with admin authentication.
 * Admin has access to /app (Medusa admin dashboard).
 */
export const test = base.extend<{
  adminContext: BrowserContext;
  adminPage: Page;
  buyerContext: BrowserContext;
  buyerPage: Page;
  salesManagerContext: BrowserContext;
  salesManagerPage: Page;
}>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();

    // API-FIRST admin authentication (no UI login — works reliably inside Docker):
    // 1. POST /auth/user/emailpass → get short-lived JWT
    // 2. POST /auth/session with Bearer <JWT> → get connect.sid session cookie
    // 3. Set connect.sid cookie in browser context → admin SPA reads session from backend
    //    (Medusa v2 admin uses session-based auth: __AUTH_TYPE__ = "session" by default)
    // 4. POST /auth/customer/emailpass → get customer JWT for /store/invites endpoint

    // STEP 1: Admin user token
    console.log("[auth] Step 1: Admin user token via /auth/user/emailpass...");
    const userTokenRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
    });
    if (!userTokenRes.ok) {
      const errText = await userTokenRes.text();
      throw new Error(`[auth] Admin /auth/user/emailpass failed: ${userTokenRes.status} ${errText}`);
    }
    const { token: adminUserToken } = (await userTokenRes.json()) as { token: string };
    console.log(`[auth] ✓ Step 1: Admin user token: ${adminUserToken.substring(0, 20)}...`);

    // STEP 2: Create a server session (returns connect.sid cookie)
    console.log("[auth] Step 2: Create admin session via /auth/session...");
    const sessionRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminUserToken}`,
      },
    });
    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      throw new Error(`[auth] Admin /auth/session failed: ${sessionRes.status} ${errText}`);
    }

    // Parse connect.sid from Set-Cookie header
    const rawCookie = sessionRes.headers.get("set-cookie") ?? "";
    console.log(`[auth] Session raw cookie: ${rawCookie.substring(0, 80)}...`);
    const sessionCookieMatch = rawCookie.match(/connect\.sid=([^;]+)/);
    if (!sessionCookieMatch) {
      throw new Error(`[auth] connect.sid not found in Set-Cookie: "${rawCookie}"`);
    }
    const sessionCookieValue = decodeURIComponent(sessionCookieMatch[1]);
    console.log(`[auth] ✓ Step 2: connect.sid obtained: ${sessionCookieValue.substring(0, 20)}...`);

    // STEP 3: Set connect.sid cookie in browser context
    // Use BACKEND_URL hostname (admin SPA is served from :9000, not :8000)
    const adminCookieDomain = (() => {
      try { return new URL(MEDUSA_BACKEND_URL).hostname; } catch { return "localhost"; }
    })();
    await context.addCookies([
      {
        name: "connect.sid",
        value: sessionCookieValue,
        domain: adminCookieDomain,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Step 3: connect.sid cookie set (domain=${adminCookieDomain})`);

    // STEP 4: Customer JWT for /store/invites endpoint
    console.log("[auth] Step 4: Admin customer JWT via /auth/customer/emailpass...");
    const customerLoginRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
    });
    if (!customerLoginRes.ok) {
      const errText = await customerLoginRes.text();
      throw new Error(
        `[auth] Admin customer API login failed: ${customerLoginRes.status} ${errText}. ` +
        `The admin user (${TEST_ADMIN_EMAIL}) must be seeded as a CUSTOMER with employee/company link.`
      );
    }
    const { token: adminCustomerToken } = (await customerLoginRes.json()) as { token: string };
    console.log(`[auth] ✓ Step 4: Customer token obtained: ${adminCustomerToken.substring(0, 20)}...`);

    // Add the customer JWT token as a cookie so tests can extract it via adminContext.cookies()
    await context.addCookies([
      {
        name: "_medusa_jwt",
        value: adminCustomerToken,
        domain: COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Step 4: Customer JWT cookie added to context`);

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
    // Use config.ts value to ensure consistency with TEST_REGION_COUNTRY default (gb)
    const TEST_REGION_COUNTRY = CONFIG_TEST_REGION_COUNTRY;

    // Step 2: LOGIN-ONLY auth flow
    // CRITICAL FIX: The fixture no longer creates a customer record via /store/customers POST
    // (which was creating a duplicate when the auth identity already existed). Instead:
    // - The seed script (seed-demo-b2b.ts) creates the customer + auth identity + employee link
    // - The fixture ONLY logs in against /auth/customer/emailpass (which returns a JWT with actor_id)
    // - If login fails, fail fast with a clear error message — do not auto-register
    console.log(`[auth] Starting buyer login flow: ${DEMO_BUYER_EMAIL}`);

    let customerToken: string;

    // Attempt login against the pre-seeded buyer account
    const loginRes = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
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
        `[auth] Buyer login failed (${loginRes.status}): ${errText}. ` +
        `Run 'task seed:demo' first to create the buyer account and auth identity.`
      );
    }

    const loginData = (await loginRes.json()) as { token: string };
    customerToken = loginData.token;
    console.log(
      `[auth] ✓ Buyer login successful; token=${customerToken.substring(0, 20)}...`
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
        domain: COOKIE_DOMAIN,
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
          "Authorization": `Bearer ${T_final}`,
        },
        data: {
          region_id: regionId,
        },
      });
      if (!createCartRes.ok()) {
        const errText = await createCartRes.text();
        throw new Error(`POST /store/carts failed: ${createCartRes.status()} ${errText}`);
      }
      const cartData = (await createCartRes.json()) as { cart?: { id: string; customer_id?: string } };
      cartId = cartData.cart?.id ?? "";
      if (!cartId) {
        throw new Error("No cart ID returned from POST /store/carts");
      }
      if (!cartData.cart?.customer_id) {
        console.warn(`[auth] WARN: Cart ${cartId} has no customer_id — CartMismatchBanner may appear. Check Authorization header was processed.`);
      }
      console.log(`[auth] ✓ Cart created: ${cartId}${cartData.cart?.customer_id ? ' (customer_id: ' + cartData.cart.customer_id + ')' : ' (ANONYMOUS — no customer_id)'}`);

      // Add line item
      const addLineRes = await context.request.post(
        `${BACKEND_URL}/store/carts/${cartId}/line-items`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": publishableKey,
            "Authorization": `Bearer ${T_final}`,
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

      // Attempt to link cart to company (seed-demo-b2b creates Demo Corp for demo-buyer@democorp.local)
      // This happens via the /admin API with a special link endpoint (if available)
      // For now, we rely on the seed script linking the cart to company via company_company_cart_cart
      // The cart creation above already set customer_id, which is sufficient for basic storefront access

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

  /**
   * Sales Manager context fixture: returns a page with admin authentication.
   * LIMITATION: The seed does not create a distinct sales-manager user (Sofia).
   * For now, we use the admin context (David) as a proxy.
   * TODO: Create a separate sales-manager employee in the seed and add auth here.
   *
   * Sales Manager would have access to quote/approval workflows in the admin dashboard.
   */
  salesManagerContext: async ({ browser }, use) => {
    const context = await browser.newContext();

    // API-FIRST admin authentication (same pattern as adminContext — no UI login):
    // 1. POST /auth/user/emailpass → admin JWT
    // 2. POST /auth/session with Bearer → connect.sid session cookie
    // 3. POST /auth/customer/emailpass → customer JWT for /store/invites

    // STEP 1: Sales Manager user token
    console.log("[auth] Step 1: Sales Manager user token via /auth/user/emailpass...");
    const userTokenRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
    });
    if (!userTokenRes.ok) {
      const errText = await userTokenRes.text();
      throw new Error(`[auth] Sales Manager /auth/user/emailpass failed: ${userTokenRes.status} ${errText}`);
    }
    const { token: smUserToken } = (await userTokenRes.json()) as { token: string };
    console.log(`[auth] ✓ Step 1: SM user token: ${smUserToken.substring(0, 20)}...`);

    // STEP 2: Create server session → connect.sid cookie
    console.log("[auth] Step 2: Create SM session via /auth/session...");
    const sessionRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${smUserToken}`,
      },
    });
    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      throw new Error(`[auth] SM /auth/session failed: ${sessionRes.status} ${errText}`);
    }
    const rawCookie = sessionRes.headers.get("set-cookie") ?? "";
    const sessionCookieMatch = rawCookie.match(/connect\.sid=([^;]+)/);
    if (!sessionCookieMatch) {
      throw new Error(`[auth] SM connect.sid not found in Set-Cookie: "${rawCookie}"`);
    }
    const smSessionCookieValue = decodeURIComponent(sessionCookieMatch[1]);
    console.log(`[auth] ✓ Step 2: SM connect.sid obtained: ${smSessionCookieValue.substring(0, 20)}...`);

    const adminCookieDomain = (() => {
      try { return new URL(MEDUSA_BACKEND_URL).hostname; } catch { return "localhost"; }
    })();
    await context.addCookies([
      {
        name: "connect.sid",
        value: smSessionCookieValue,
        domain: adminCookieDomain,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Step 2: SM connect.sid cookie set (domain=${adminCookieDomain})`);

    // STEP 3: Customer JWT for /store/invites endpoint
    console.log("[auth] Step 3: Sales Manager customer JWT via /auth/customer/emailpass...");
    const customerLoginRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
    });
    if (!customerLoginRes.ok) {
      const errText = await customerLoginRes.text();
      throw new Error(
        `[auth] Sales Manager customer API login failed: ${customerLoginRes.status} ${errText}. ` +
        `The admin user (${TEST_ADMIN_EMAIL}) must be seeded as a CUSTOMER with employee/company link.`
      );
    }
    const { token: salesManagerCustomerToken } = (await customerLoginRes.json()) as { token: string };
    console.log(`[auth] ✓ Step 3: Sales Manager customer token obtained: ${salesManagerCustomerToken.substring(0, 20)}...`);

    await context.addCookies([
      {
        name: "_medusa_jwt",
        value: salesManagerCustomerToken,
        domain: COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    console.log(`[auth] ✓ Step 3: Sales Manager customer JWT cookie added to context`);

    await use(context);
    await context.close();
  },

  salesManagerPage: async ({ salesManagerContext }, use) => {
    const page = await salesManagerContext.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(30000);
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
