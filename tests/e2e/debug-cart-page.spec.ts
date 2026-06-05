import { test, expect } from "./fixtures/auth";
import { seedProduct } from "./fixtures/seed";
import {
  STOREFRONT_URL,
  SCREENSHOTS_DIR,
  TEST_REGION_COUNTRY,
} from "./config";

test("Debug: Check cart page HTML and button visibility", async ({
  buyerPage,
}) => {
  // Seed product
  const product = await seedProduct();
  const productHandle = product.handle ?? "test-product-b2b";

  // Navigate to product, add to cart
  await buyerPage.goto(
    `${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/products/${productHandle}`
  );
  await buyerPage.waitForLoadState("networkidle");

  const incrementBtn = buyerPage.locator("table tbody tr:first-child button:last-child")
    .or(buyerPage.locator("table tbody tr").first().locator("button").last());
  const hasVariantTable = await incrementBtn.first().isVisible().catch(() => false);
  if (hasVariantTable) {
    await incrementBtn.first().click();
    await buyerPage.waitForLoadState("domcontentloaded");
  }

  const addToCartBtn = buyerPage.getByRole("button", { name: /add to cart/i });
  await addToCartBtn.first().click();
  await buyerPage.waitForLoadState("networkidle");

  // Navigate to cart
  await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/cart`);
  await buyerPage.waitForLoadState("networkidle");

  // Capture full HTML
  const html = await buyerPage.content();
  console.log("Cart page HTML length:", html.length);

  // Check for Request Quote button
  const hasRequestQuoteBtn = html.includes("Request Quote");
  console.log("HTML contains 'Request Quote':", hasRequestQuoteBtn);

  // Check for customer-specific gate !!customer
  const hasCustomerGate = html.includes("!!customer") || html.includes("customer &&");
  console.log("HTML contains customer gate:", hasCustomerGate);

  // Try to find the button directly
  const requestQuoteBtn = buyerPage
    .getByRole("button", { name: "Request Quote" })
    .or(buyerPage.locator('[data-testid="request-quote-btn"]'));

  const btnCount = await requestQuoteBtn.count();
  console.log("Request Quote button count:", btnCount);

  // Take screenshot
  await buyerPage.screenshot({
    path: `${SCREENSHOTS_DIR}/debug-cart-page.png`,
  });

  // Also save HTML for inspection
  const fs = require("fs");
  fs.writeFileSync(
    `${SCREENSHOTS_DIR}/debug-cart-page.html`,
    html
  );
  console.log(`Saved HTML to ${SCREENSHOTS_DIR}/debug-cart-page.html`);

  // Log all buttons on the page
  const buttons = await buyerPage.locator("button").allTextContents();
  console.log("All buttons:", buttons);

  expect(btnCount).toBeGreaterThan(0);
});
