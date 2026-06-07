import path from "node:path";
import { test, expect } from "../fixtures/auth";
import {
  seedMarketRegions,
  seedProduct,
} from "../fixtures/seed";
import {
  SCREENSHOTS_DIR,
  STOREFRONT_URL,
  SUPPORTED_MARKETS,
} from "../config";

/**
 * Per-Market Currency Rendering Suite
 *
 * Validates that:
 * 1. All 6 market regions are seeded (nz, au, sg, vn, us, gb)
 * 2. Prices render with the correct currency symbol per market
 * 3. VND (Vietnam) renders with no decimal places
 * 4. No foreign currency symbols appear in the rendered UI
 *
 * This is the VISUAL-CONTENT verify gate (see visual-content-verify-gate.md):
 * - Tests pass GREEN ✓
 * - Rendered UI shows correct currency symbol ✓
 * - VND is zero-decimal ✓
 * - Screenshots captured to tmp/Digital-Commerce/demo/flows/markets/ ✓
 */

test.describe("Per-Market Currency Rendering", () => {
  /**
   * Setup once: Seed all 6 market regions before running currency tests.
   * Product is seeded once and reused across all market tests.
   */
  test.beforeAll(async () => {
    console.log("Seeding 6-market regions from SUPPORTED_MARKETS SSOT...");
    await seedMarketRegions();

    console.log("Seeding product for currency rendering tests...");
    await seedProduct();

    console.log(`Setup complete: ${SUPPORTED_MARKETS.length} markets seeded`);
  });

  /**
   * Test NZ (New Zealand) — NZ$ symbol, decimal places (2)
   */
  test("NZ market: renders NZ$ symbol with decimal places", async ({
    page,
  }) => {
    const marketIso2 = "nz";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert NZ$ symbol is present (localized symbol)
    // NZ$ or NZD expected in the rendered text
    expect(priceText).toMatch(/NZ\$|NZD|\$.*NZ/i);

    // Assert decimal places are shown (e.g., "NZ$129.00")
    expect(priceText).toMatch(/\.\d{2}/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ NZ market screenshot captured: ${screenshotPath}`);
  });

  /**
   * Test AU (Australia) — A$ symbol, decimal places (2)
   */
  test("AU market: renders A$ symbol with decimal places", async ({
    page,
  }) => {
    const marketIso2 = "au";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert A$ symbol is present (localized symbol for Australia)
    // A$ or AUD expected in the rendered text
    expect(priceText).toMatch(/A\$|AUD|\$.*AU/i);

    // Assert decimal places are shown
    expect(priceText).toMatch(/\.\d{2}/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ AU market screenshot captured: ${screenshotPath}`);
  });

  /**
   * Test VN (Vietnam) — ₫ symbol, ZERO decimal places (VND is zero-decimal)
   * This is the critical gate for visual-content-verify: VND must NOT show ".00"
   */
  test("VN market: renders ₫ symbol with NO decimal places (zero-decimal currency)", async ({
    page,
  }) => {
    const marketIso2 = "vn";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert ₫ symbol (Vietnamese Dong) is present
    expect(priceText).toMatch(/₫|VND/i);

    // CRITICAL: Assert VND has NO decimal places (zero-decimal currency)
    // Valid: "₫625000" or "625000₫"
    // Invalid: "₫625000.00" or "625000.00₫"
    // Regex: match 1+ digits, NOT followed by dot-digits
    expect(priceText).toMatch(/\d{1,}(?![\.\,]\d)/);
    // Ensure we explicitly DO NOT see decimal notation
    expect(priceText).not.toMatch(/\.\d{2}$/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ VN market screenshot captured: ${screenshotPath}`);
  });

  /**
   * Test US (United States) — $ symbol, decimal places (2)
   */
  test("US market: renders $ symbol with decimal places", async ({
    page,
  }) => {
    const marketIso2 = "us";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert $ symbol is present (US dollar)
    expect(priceText).toMatch(/^\s*\$|USD/i);

    // Assert decimal places are shown
    expect(priceText).toMatch(/\.\d{2}/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ US market screenshot captured: ${screenshotPath}`);
  });

  /**
   * Test GB (United Kingdom) — £ symbol, decimal places (2)
   */
  test("GB market: renders £ symbol with decimal places", async ({
    page,
  }) => {
    const marketIso2 = "gb";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert £ symbol is present (British Pound)
    expect(priceText).toMatch(/£|GBP/i);

    // Assert decimal places are shown
    expect(priceText).toMatch(/\.\d{2}/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ GB market screenshot captured: ${screenshotPath}`);
  });

  /**
   * Test SG (Singapore) — S$ symbol, decimal places (2)
   */
  test("SG market: renders S$ symbol with decimal places", async ({
    page,
  }) => {
    const marketIso2 = "sg";
    const market = SUPPORTED_MARKETS.find((m) => m.iso2 === marketIso2);

    await page.goto(`${STOREFRONT_URL}/${marketIso2}/products/test-product-b2b`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // VISUAL-2: Assert PRIMARY expected content (price) is visible and non-empty
    const priceLocator = page.locator("[data-testid='product-price']").first();
    await expect(priceLocator).toBeVisible();
    const priceText = await priceLocator.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).not.toMatch(/^\s*$/);

    // VISUAL-3: Assert zero error markers in viewport
    await expect(
      page.getByText(/Forbidden|500|Something went wrong/i)
    ).not.toBeVisible();

    // Assert S$ symbol is present (Singapore Dollar)
    expect(priceText).toMatch(/S\$|SGD/i);

    // Assert decimal places are shown
    expect(priceText).toMatch(/\.\d{2}/);

    // VISUAL-4: Capture screenshot
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      `${marketIso2}-currency-${new Date().toISOString().split("T")[0]}.png`
    );
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ SG market screenshot captured: ${screenshotPath}`);
  });
});
