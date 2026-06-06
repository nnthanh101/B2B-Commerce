import { test } from "./fixtures/auth";

test("Debug: Check HTML structure and variants", async ({ buyerPage }) => {
  const STOREFRONT_URL = "http://localhost:8000";
  const TEST_REGION_COUNTRY = "nz";
  
  // Go to store listing
  await buyerPage.goto(`${STOREFRONT_URL}/${TEST_REGION_COUNTRY}/store`);
  await buyerPage.waitForLoadState("networkidle");
  
  // Click first product
  const firstProduct = buyerPage.locator('[data-testid="product-card"], a[href*="/products/"]').first();
  const isVisible = await firstProduct.isVisible();
  if (isVisible) {
    await firstProduct.click();
    await buyerPage.waitForLoadState("networkidle");
    await buyerPage.waitForTimeout(2000);
    
    // Check for Table elements
    const tables = await buyerPage.locator("table").count();
    console.log(`Tables on page: ${tables}`);
    
    // Check for input fields
    const inputs = await buyerPage.locator("input").count();
    console.log(`Input fields: ${inputs}`);
    
    // Try to find elements by role
    const headings = await buyerPage.locator("h1").allTextContents();
    console.log(`Headings: ${headings.join(", ")}`);
    
    // Check for any text mentioning SKU or variant
    const bodyText = await buyerPage.locator("body").textContent();
    const hasSKU = bodyText?.includes("SKU");
    const hasVariant = bodyText?.includes("variant");
    console.log(`Has SKU text: ${hasSKU}, Has variant text: ${hasVariant}`);
    
    // Look for Add to Cart button
    const addButton = await buyerPage.locator('[data-testid="add-product-button"]').count();
    console.log(`Add to cart buttons found: ${addButton}`);
    
    // Check for any buttons with "choose" text
    const chooseButtons = await buyerPage.getByRole("button", { name: /choose/i }).count();
    console.log(`Choose buttons: ${chooseButtons}`);
  }
});
