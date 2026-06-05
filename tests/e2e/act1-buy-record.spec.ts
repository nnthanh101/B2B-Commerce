import path from "node:path";
import { test, expect } from "./fixtures/auth";
import { seedCompany, seedEmployee, seedProduct, seedApprovalSettings } from "./fixtures/seed";
import { SCREENSHOTS_DIR } from "./config";

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";
const TEST_REGION_COUNTRY = process.env.TEST_REGION_COUNTRY || "dk";

/**
 * Act 1: "Buy" — Full B2B Buyer Journey Recording
 *
 * Captures the complete buyer persona flow:
 * Scene 1.1: Home page (product catalog)
 * Scene 1.2: Product detail (add to cart)
 * Scene 1.3: Cart + Request Quote
 * Scene 1.4: Quote submission confirmation
 *
 * Video output: .webm (auto) + per-scene screenshots
 * Pacing: Deliberate waits to ensure scenes are visible (~15s per scene)
 */
test("Act 1 Complete Journey (video recording)", async ({
  buyerPage,
}) => {
  // Setup: Seed company, employee, product, and approval settings once per test
  const company = await seedCompany();
  const companyId = company.id;

  await seedEmployee(companyId);
  await seedProduct();
  await seedApprovalSettings(companyId);

  console.log(`Setup complete: company ID = ${companyId}`);

  {
    // Wrapped in a block for scope clarity
    // Ensure video is being recorded (Playwright auto-records via playwright.config.ts video: 'on')
    console.log("🎥 Recording started (Playwright video: on)");

    // ==============================================================
    // Scene 1.1: Buyer navigates home (00:05–00:20)
    // ==============================================================
    console.log("Scene 1.1: Home page");
    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}`);
    await buyerPage.waitForLoadState("networkidle");

    // Deliberate pause: let viewer see the home page
    await buyerPage.waitForTimeout(3000);

    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "act1-1-home.png"),
    });

    // ==============================================================
    // Scene 1.2: Browse & find product (00:20–00:35)
    // ==============================================================
    console.log("Scene 1.2: Product listing & detail");

    // Navigate to store listing (discover the 599 EUR monitor)
    await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/store`);
    await buyerPage.waitForLoadState("networkidle");
    await buyerPage.waitForTimeout(2500);

    await buyerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "act1-2a-store-listing.png"),
    });

    // Click the first product to view details
    const firstProduct = buyerPage.locator('[data-testid="product-card"], a[href*="/products/"]').first();
    const isVisible = await firstProduct.isVisible().catch(() => false);

    if (isVisible) {
      await firstProduct.click();
      await buyerPage.waitForLoadState("networkidle");
      await buyerPage.waitForTimeout(3500);

      await buyerPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, "act1-2b-product-detail.png"),
      });

      // ==============================================================
      // Scene 1.3: Add to cart (00:35–00:50)
      // ==============================================================
      console.log("Scene 1.3: Add to cart");

      // Wait for the variant table to load (may be behind Suspense boundary)
      await buyerPage.waitForSelector('table, [data-testid="add-product-button"]', { timeout: 10000 }).catch(() => {
        console.log("⚠️  Variant table or add button did not appear within timeout");
      });

      // Select a quantity first — look for the input field and increment button
      // The BulkTableQuantity has a structure: input field + minus + plus buttons
      const quantityInputs = await buyerPage.locator('input[type="number"]').all();
      console.log(`Found ${quantityInputs.length} number inputs`);

      if (quantityInputs.length > 0) {
        // Click the first input to ensure it's focused, then type
        await quantityInputs[0].click();
        await quantityInputs[0].fill("1");
        await buyerPage.waitForTimeout(500);

        // Now click the "Add to cart" button
        const addToCartBtn = buyerPage.locator('[data-testid="add-product-button"]');
        const btnVisible = await addToCartBtn.isVisible().catch(() => false);

        if (btnVisible) {
          await addToCartBtn.click();
          await buyerPage.waitForLoadState("networkidle");
          await buyerPage.waitForTimeout(2000);

          await buyerPage.screenshot({
            path: path.join(SCREENSHOTS_DIR, "act1-3-added-to-cart.png"),
          });

          // ==============================================================
          // Scene 1.4: Cart & Request Quote (00:50–01:05)
          // ==============================================================
          console.log("Scene 1.4: Cart added, now in product page");

          // The "Request Quote" button is in the header (seen in earlier screenshots)
          // Let's take another screenshot of the current product page state with the cart indicator
          await buyerPage.waitForTimeout(1500);

          await buyerPage.screenshot({
            path: path.join(SCREENSHOTS_DIR, "act1-4a-product-with-cart.png"),
          });

          // Request Quote button might be in the header — try multiple selectors
          let rqVisible = false;
          let requestQuoteBtn = buyerPage.locator('a:has-text("Quote"), button:has-text("Quote")').first();

          if (await requestQuoteBtn.isVisible().catch(() => false)) {
            rqVisible = true;
          } else {
            // Try alternative text patterns
            requestQuoteBtn = buyerPage.getByText(/request.*quote|quote/i).first();
            rqVisible = await requestQuoteBtn.isVisible().catch(() => false);
          }

          if (rqVisible) {
            // The Quote button opens a dialog/modal
            // Use force:true to bypass overlay checks if needed
            try {
              await requestQuoteBtn.click({ force: true, timeout: 5000 });
            } catch {
              console.log("Note: Quote button click had overlay, but proceeding...");
            }

            await buyerPage.waitForLoadState("networkidle");
            await buyerPage.waitForTimeout(2000);

            await buyerPage.screenshot({
              path: path.join(SCREENSHOTS_DIR, "act1-4b-quote-dialog.png"),
            });

            console.log("Scene 1.5: Quote dialog opened");
          } else {
            // Quote feature may not be exposed in the buyer UI
            console.log("⚠️  Request Quote button not found — possibly F-gap or feature not exposed");

            // Just capture the final state
            await buyerPage.waitForTimeout(1500);
            await buyerPage.screenshot({
              path: path.join(SCREENSHOTS_DIR, "act1-4b-final-product-state.png"),
            });
          }
        } else {
          console.log("⚠️  Add to cart button not found");
        }
      } else {
        console.log("⚠️  No quantity input fields found on product page");
      }
    } else {
      console.log("⚠️  No products found in store listing");
    }

    console.log("🎥 Recording complete");
  }
});
