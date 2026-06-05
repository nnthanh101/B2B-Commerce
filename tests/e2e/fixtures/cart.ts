import { BrowserContext } from "@playwright/test";
import { BACKEND_URL, TEST_REGION_COUNTRY, getPublishableKey } from "../config";

/**
 * Helper: Resolve region UUID from /store/regions
 *
 * CRITICAL: The region_id parameter in POST /store/carts MUST be a UUID (reg_...)
 * NOT a country code like "dk". This function performs the lookup.
 *
 * @returns region UUID (e.g., "reg_01KTB6993S0NGH6G1Z5KCHH9NE")
 */
async function resolveRegionUuid(publishableKey: string): Promise<string> {
  console.log(`[cart] Resolving region UUID for country: ${TEST_REGION_COUNTRY}`);

  const regionRes = await fetch(`${BACKEND_URL}/store/regions`, {
    method: "GET",
    headers: {
      "x-publishable-api-key": publishableKey,
      "Content-Type": "application/json",
    },
  });

  if (!regionRes.ok) {
    throw new Error(
      `[cart] Failed to fetch regions: ${regionRes.status} ${regionRes.statusText}`
    );
  }

  const regionData = (await regionRes.json()) as {
    regions?: Array<{
      id: string;
      countries?: Array<{ iso_2: string }>;
    }>;
  };

  if (!regionData.regions || regionData.regions.length === 0) {
    throw new Error(`[cart] No regions found`);
  }

  // Find region that contains TEST_REGION_COUNTRY
  const region = regionData.regions.find((r) =>
    r.countries?.some((c) => c.iso_2 === TEST_REGION_COUNTRY)
  );

  if (!region) {
    throw new Error(
      `[cart] No region found for country: ${TEST_REGION_COUNTRY}`
    );
  }

  console.log(`[cart] ✓ Region UUID resolved: ${region.id}`);
  return region.id;
}

/**
 * Helper: Create a cart for a buyer and add a line item (product variant).
 *
 * Flow:
 * 1. Resolve region UUID generically from /store/regions (S3 rule)
 * 2. Call POST /store/carts (with publishable key + region_id) to create an empty cart
 * 3. Add a line item using POST /store/carts/:id/line-items (variant_id, quantity)
 * 4. Return the cart_id so the test can set the _medusa_cart_id cookie
 *
 * CRITICAL: Before calling this, the buyer MUST be authenticated (JWT token available).
 * This function uses API headers injected by the context's request interceptor.
 *
 * @param context — BrowserContext (has request interceptor that injects Authorization header)
 * @param variantId — product variant ID to add to cart
 * @param quantity — number of items to add (default: 1)
 * @returns cartId — the cart ID to set in _medusa_cart_id cookie
 */
export async function createCartAndAddLineItem(
  context: BrowserContext,
  variantId: string,
  quantity: number = 1
): Promise<string> {
  const publishableKey = await getPublishableKey();

  // Step 0: Resolve region UUID (S3 rule: NEVER pass country code as region_id)
  const regionId = await resolveRegionUuid(publishableKey);

  // Step 1: Create an empty cart via store API with region_id
  console.log(`[cart] Creating cart with region_id="${regionId}"...`);
  const createCartRes = await context.request.post(`${BACKEND_URL}/store/carts`, {
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": publishableKey,
    },
    data: {
      region_id: regionId,
    },
  });

  if (!createCartRes.ok()) {
    const errText = await createCartRes.text();
    throw new Error(
      `[cart] POST /store/carts failed: ${createCartRes.status()} ${errText}`
    );
  }

  const cartData = (await createCartRes.json()) as { cart?: { id: string } };
  const cartId = cartData.cart?.id;

  if (!cartId) {
    throw new Error(
      `[cart] No cart ID returned from POST /store/carts. Response: ${JSON.stringify(cartData)}`
    );
  }

  console.log(`[cart] ✓ Cart created: ${cartId}`);

  // Step 2: Add a line item to the cart
  console.log(`[cart] Adding line item (variant_id="${variantId}", qty=${quantity})...`);
  const addLineRes = await context.request.post(
    `${BACKEND_URL}/store/carts/${cartId}/line-items`,
    {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
      },
      data: {
        variant_id: variantId,
        quantity,
      },
    }
  );

  if (!addLineRes.ok()) {
    const errText = await addLineRes.text();
    const status = addLineRes.status();
    console.error(`[cart] LINE ITEM DEBUG: POST failed with ${status}`);
    console.error(`[cart] variant_id type: ${typeof variantId}, value: "${variantId}"`);
    console.error(`[cart] response body: ${errText}`);
    throw new Error(
      `[cart] POST /store/carts/:id/line-items failed: ${status} ${errText}. variant_id="${variantId}"`
    );
  }

  const lineData = (await addLineRes.json()) as { cart?: { items?: unknown[] } };
  const itemCount = lineData.cart?.items?.length || 0;

  if (itemCount === 0) {
    throw new Error(
      `[cart] Line item was not added (HTTP ${addLineRes.status()} but items length is 0)`
    );
  }

  console.log(
    `[cart] ✓ Line item added. Cart now has ${itemCount} item(s).`
  );

  return cartId;
}

/**
 * Helper: Set the _medusa_cart_id cookie on a BrowserContext.
 *
 * This mirrors the pattern used in auth.ts for setting the _medusa_jwt cookie.
 * The context MUST have navigated to STOREFRONT_URL first (to establish the domain).
 *
 * NOTE: _medusa_cart_id is NOT httpOnly (it doesn't contain secrets), so the client-side
 * JavaScript can read it. This is intentional for cart state management.
 *
 * @param context — BrowserContext
 * @param cartId — cart ID to set in the cookie
 * @param storefrontUrl — STOREFRONT_URL (defaults to http://localhost:8000)
 */
export async function setCartIdCookie(
  context: BrowserContext,
  cartId: string,
  storefrontUrl: string = "http://localhost:8000"
) {
  console.log(`[cart] Setting _medusa_cart_id cookie: ${cartId}`);
  await context.addCookies([
    {
      name: "_medusa_cart_id",
      value: cartId,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
  console.log(`[cart] ✓ Cookie set`);
}

/**
 * Integration helper: Create cart, add line item, and set cookie in one call.
 *
 * Use this in test setup to populate a buyer's cart before navigating to /cart.
 *
 * @param context — BrowserContext (must be from buyerContext fixture)
 * @param variantId — product variant ID to add
 * @param storefrontUrl — STOREFRONT_URL for cookie domain
 * @returns cartId — the cart ID (for reference)
 */
export async function populateBuyerCart(
  context: BrowserContext,
  variantId: string,
  storefrontUrl: string = "http://localhost:8000"
): Promise<string> {
  const cartId = await createCartAndAddLineItem(context, variantId, 1);
  await setCartIdCookie(context, cartId, storefrontUrl);
  return cartId;
}
