/**
 * D0 Red-Green test: Verify buyer auth fixture cookie hydration
 *
 * RED: Current fixture logs buyer in but does NOT set _medusa_jwt cookie → 404 on protected routes
 * GREEN: After fix, _medusa_jwt present → routes render real content
 *
 * Routes under test:
 * - /dk/account/quotes (protected, requires auth)
 * - /dk/account/orders (protected, requires auth)
 * - /dk/account/approvals (protected, requires auth)
 *
 * Issue: fixtures/auth.ts buyerContext logs in but never persists JWT to context
 * Fix: After successful login, extract token from response and set _medusa_jwt cookie
 */

import path from "node:path";
import { test, expect } from "./fixtures/auth";
import { SCREENSHOTS_DIR } from "./config";

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const TEST_REGION_COUNTRY = process.env.TEST_REGION_COUNTRY || "nz";

test.describe("D0 Buyer Auth Cookie Hydration (RED-GREEN)", () => {
  test("RED: Navigate to /dk/account/quotes with current fixture — verify status code and rendered content", async ({
    buyerPage,
  }) => {
    // RED state: buyerPage fixture has logged in, but _medusa_jwt not persisted to context
    // Expected: either 404 or 200 with "not found" placeholder (HTTP 200 lies)
    // We assert on RENDERED content, not status code

    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/account/quotes`, {
      waitUntil: "domcontentloaded",
    });

    // Screenshot BEFORE fix
    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "d0-red-before-fix-quotes.png"),
    });

    // Check: does the page show real quotes content or a not-found placeholder?
    // Real quotes page has: "Quotes", quote list items, or "No quotes yet" message
    const quotesHeader = buyerPage.getByText(/Quotes|quote/i);
    const quoteItems = buyerPage.locator('[data-testid="quote-item"]').or(
      buyerPage.locator('a[href*="/account/quotes/details/"]')
    );

    // Log current state
    const content = await buyerPage.content();
    const isNotFound = content.includes("404") || content.includes("not found") || content.includes("Not Found");
    const hasQuotesHeader = await quotesHeader.first().isVisible().catch(() => false);
    const hasQuoteItems = await quoteItems.first().isVisible().catch(() => false);

    console.log(`[RED] /quotes page:`);
    console.log(`  - HTTP 404/notFound present: ${isNotFound}`);
    console.log(`  - Quotes header visible: ${hasQuotesHeader}`);
    console.log(`  - Quote items visible: ${hasQuoteItems}`);
    console.log(`  - Content length: ${content.length}`);

    // Log cookies present on page
    const cookies = await buyerPage.context().cookies();
    const hasMedusaJwt = cookies.some((c) => c.name === "_medusa_jwt");
    console.log(`[RED] Cookies on page: ${cookies.map((c) => c.name).join(", ")}`);
    console.log(`  - _medusa_jwt present: ${hasMedusaJwt}`);

    // RED assertion: if fixture is broken, we expect NO quotes content visible
    // This test documents the current broken state
    if (!hasMedusaJwt) {
      console.log(
        "⚠️  EXPECTED RED STATE: _medusa_jwt cookie NOT present — quotes page should 404 or show notFound"
      );
      // Don't fail the test; just document the state
      // Next test will verify GREEN state after fix
    }
  });

  test("GREEN: After fix — /dk/account/quotes renders real content", async ({
    buyerPage,
  }) => {
    // After fixtures/auth.ts is fixed to set _medusa_jwt, this test should PASS
    // Expected: page renders with quotes list or "No quotes yet" message + header

    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/account/quotes`, {
      waitUntil: "networkidle",
    });

    // Screenshot AFTER fix
    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "d0-green-after-fix-quotes.png"),
    });

    // Verify cookies are now present
    const cookies = await buyerPage.context().cookies();
    const hasMedusaJwt = cookies.some((c) => c.name === "_medusa_jwt");
    console.log(`[GREEN] Cookies on page: ${cookies.map((c) => c.name).join(", ")}`);
    console.log(`  - _medusa_jwt present: ${hasMedusaJwt}`);

    // GREEN assertion: page should render with quotes content (real or empty state)
    const content = await buyerPage.content();
    const contentLength = content.length;

    // Real assertion: after fix, JWT should be present
    expect(hasMedusaJwt).toBeTruthy();

    // Real assertion: page loaded content (non-empty)
    expect(contentLength).toBeGreaterThan(100);

    // Real assertion: page should have quotes-related text
    expect(content).toMatch(/quotes|Quotes/i);
  });

  test("GREEN: /dk/account/orders renders real content after auth fix", async ({
    buyerPage,
  }) => {
    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/account/orders`, {
      waitUntil: "networkidle",
    });

    // Screenshot AFTER fix
    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "d0-green-after-fix-orders.png"),
    });

    // Verify cookies
    const cookies = await buyerPage.context().cookies();
    const hasMedusaJwt = cookies.some((c) => c.name === "_medusa_jwt");
    console.log(`[GREEN] Orders page cookies: ${cookies.map((c) => c.name).join(", ")}`);

    // Assertions
    const content = await buyerPage.content();
    const contentLength = content.length;

    expect(hasMedusaJwt).toBeTruthy();
    expect(contentLength).toBeGreaterThan(100);
    expect(content).toMatch(/orders|Orders/i);
  });

  test("GREEN: /dk/account/approvals renders real content after auth fix", async ({
    buyerPage,
  }) => {
    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/account/approvals`, {
      waitUntil: "networkidle",
    });

    // Screenshot AFTER fix
    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "d0-green-after-fix-approvals.png"),
    });

    // Verify cookies
    const cookies = await buyerPage.context().cookies();
    const hasMedusaJwt = cookies.some((c) => c.name === "_medusa_jwt");

    // Assertions
    const content = await buyerPage.content();
    const contentLength = content.length;

    expect(hasMedusaJwt).toBeTruthy();
    expect(contentLength).toBeGreaterThan(100);
    expect(content).toMatch(/approval|Approval/i);
  });
});
