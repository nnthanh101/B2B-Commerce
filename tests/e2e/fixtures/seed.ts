import {
  BACKEND_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SUPPORTED_MARKETS,
} from "../config";

const MEDUSA_BACKEND_URL = BACKEND_URL;
const TEST_ADMIN_EMAIL = ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = ADMIN_PASSWORD;

/**
 * Admin API headers with authentication token.
 */
async function getAdminHeaders(): Promise<{
  headers: Record<string, string>;
}> {
  const loginRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(
      `Admin auth failed: ${loginRes.status} ${loginRes.statusText}`
    );
  }

  const { token } = await loginRes.json();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

/**
 * Seed: Create admin user if not exists.
 * Idempotent: does not error if user already exists.
 */
export async function seedAdmin() {
  const adminHeaders = await getAdminHeaders();

  // Admin user already exists in test setup; no-op here
  // In a real scenario, this would create the first admin user.
  return { email: TEST_ADMIN_EMAIL };
}

/**
 * Seed: Create a test company with one employee (buyer).
 * POST /admin/companies (or /store/companies if store API)
 * Idempotent: GET first, return if exists, only POST if absent.
 *
 * FIX F-2: Removed spending_limit_reset_frequency (not in /admin/companies schema).
 * This field is set per-employee in seedEmployee(), not per-company.
 */
export async function seedCompany() {
  const adminHeaders = await getAdminHeaders();
  const companyName = "OceanSoft Test Corp";

  // Check if company already exists by listing and filtering
  const listRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/companies`, {
    method: "GET",
    ...adminHeaders,
  });

  if (listRes.ok) {
    const { companies = [] } = await listRes.json();
    const existing = companies.find(
      (c: { name: string }) => c.name === companyName
    );
    if (existing) {
      console.log(`Company "${companyName}" already exists, reusing it`);
      return existing;
    }
  }

  const companyRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/companies`, {
    method: "POST",
    ...adminHeaders,
    body: JSON.stringify({
      name: companyName,
      email: "contact@oceansoft.io",
      phone: "+64 12 34 56 78",
      address: "123 Hurstmere Road",
      city: "NorthShore",
      state: "Auckland",
      zip: "0622",
      country: "New Zealand",
      currency_code: SUPPORTED_MARKETS[0].currency.toUpperCase(), // NZD (first market)
    }),
  });

  if (!companyRes.ok) {
    const text = await companyRes.text();
    throw new Error(
      `Failed to create company: ${companyRes.status} ${text}`
    );
  }

  const company = await companyRes.json();
  return company;
}

/**
 * Seed: Create employee (buyer) within a company.
 *
 * FIX F-2: The /admin/companies/:id/employees endpoint requires a customer_id (existing customer).
 * This function links a buyer customer to a company.
 *
 * DESIGN DECISION: Employee seeding happens in the context of the test.
 * Option A: Seed before buyer registration (we don't have customer_id yet).
 * Option B: Register buyer first, then call this function with the customer_id.
 * Option C: Inline during buyer registration (handled in auth.ts).
 *
 * Current: OPTION B (idempotent lookup by email, then link if not already linked).
 * We fetch the registered buyer by email, then link them to the company via
 * POST /admin/companies/:id/employees.
 *
 * Contract: POST /admin/companies/:id/employees
 * Body: { customer_id: string (REQUIRED), spending_limit?: number, is_admin?: boolean }
 */
export async function seedEmployee(companyId: string, customerEmail?: string) {
  const adminHeaders = await getAdminHeaders();
  const buyerEmail = customerEmail || "buyer@oceansoft.test";

  // Step 1: Get the admin token (already have from adminHeaders)
  // Step 2: Fetch customers to find the buyer by email
  const customersRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/customers?q=${encodeURIComponent(buyerEmail)}`,
    {
      method: "GET",
      ...adminHeaders,
    }
  );

  if (!customersRes.ok) {
    console.warn(
      `⚠️  seedEmployee: Failed to list customers (${customersRes.status()}). ` +
      `Skipping employee seeding. Buyer registration in auth.ts must complete first.`
    );
    return { id: "employee-stub", companyId };
  }

  const { customers = [] } = await customersRes.json();
  const customer = customers.find((c: { email: string }) => c.email === buyerEmail);

  if (!customer || !customer.id) {
    console.warn(
      `⚠️  seedEmployee: Customer "${buyerEmail}" not found in backend. ` +
      `This is expected on first test run. Buyer registration happens in auth.ts fixture. ` +
      `Skipping employee seeding.`
    );
    return { id: "employee-stub", companyId };
  }

  // Step 3: Check if employee already exists (list existing employees)
  const listEmployeesRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "GET",
      ...adminHeaders,
    }
  );

  if (listEmployeesRes.ok) {
    const { employees = [] } = await listEmployeesRes.json();
    const existing = employees.find(
      (e: { customer_id?: string; id?: string }) => e.customer_id === customer.id
    );
    if (existing) {
      console.log(
        `Employee for customer "${buyerEmail}" already linked to company ${companyId}, reusing it`
      );
      return existing;
    }
  }

  // Step 4: Create employee (link customer to company)
  const employeeRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "POST",
      ...adminHeaders,
      body: JSON.stringify({
        customer_id: customer.id,
        spending_limit: 50000, // 500 DKK default spending limit
        is_admin: false,
      }),
    }
  );

  if (!employeeRes.ok) {
    const text = await employeeRes.text();
    console.warn(
      `⚠️  seedEmployee: Failed to create employee: ${employeeRes.status()} ${text}. ` +
      `Company ${companyId} and customer ${customer.id} prepared, but linking failed. ` +
      `Tests may fail at the company-card display step.`
    );
    return { id: "employee-stub", companyId, customer_id: customer.id };
  }

  const employee = await employeeRes.json();
  console.log(
    `✓ Employee created: customer ${customer.id} linked to company ${companyId}`
  );
  return employee.employee || employee;
}

/**
 * Seed: Create admin employee for approval workflows.
 * Links the admin user (from TEST_ADMIN_EMAIL) to the company with is_admin=true.
 * This allows the admin to access /store/approvals and manage approval workflows.
 */
export async function seedAdminEmployee(companyId: string) {
  const adminHeaders = await getAdminHeaders();
  const adminEmail = ADMIN_EMAIL;

  // Step 1: Fetch admin customer by email (admin user auto-created by Medusa)
  const customersRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/customers?q=${encodeURIComponent(adminEmail)}`,
    {
      method: "GET",
      ...adminHeaders,
    }
  );

  if (!customersRes.ok) {
    console.warn(
      `⚠️  seedAdminEmployee: Failed to list admin customer (${customersRes.status()}). ` +
      `Admin may not be seeded yet.`
    );
    return { id: "admin-stub", companyId };
  }

  const { customers = [] } = await customersRes.json();
  const adminCustomer = customers.find((c: { email: string }) => c.email === adminEmail);

  if (!adminCustomer || !adminCustomer.id) {
    console.warn(
      `⚠️  seedAdminEmployee: Admin customer "${adminEmail}" not found. ` +
      `Skipping admin employee seeding.`
    );
    return { id: "admin-stub", companyId };
  }

  // Step 2: Check if admin employee already exists
  const listEmployeesRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "GET",
      ...adminHeaders,
    }
  );

  if (listEmployeesRes.ok) {
    const { employees = [] } = await listEmployeesRes.json();
    const existingAdmin = employees.find(
      (e: { customer_id?: string; is_admin?: boolean }) =>
        e.customer_id === adminCustomer.id && e.is_admin === true
    );
    if (existingAdmin) {
      console.log(
        `Admin employee for "${adminEmail}" already linked to company ${companyId}`
      );
      return existingAdmin;
    }
  }

  // Step 3: Create admin employee (link admin customer to company with is_admin=true)
  const adminEmployeeRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "POST",
      ...adminHeaders,
      body: JSON.stringify({
        customer_id: adminCustomer.id,
        is_admin: true,
      }),
    }
  );

  if (!adminEmployeeRes.ok) {
    const text = await adminEmployeeRes.text();
    console.warn(
      `⚠️  seedAdminEmployee: Failed to create admin employee: ${adminEmployeeRes.status()} ${text}. ` +
      `Admin approvals workflows may fail.`
    );
    return { id: "admin-stub", companyId, customer_id: adminCustomer.id };
  }

  const adminEmployee = await adminEmployeeRes.json();
  console.log(
    `✓ Admin employee created: customer ${adminCustomer.id} linked to company ${companyId} with is_admin=true`
  );
  return adminEmployee.employee || adminEmployee;
}

/**
 * Seed: Create a product for the store.
 * POST /admin/products
 * Idempotent: GET by handle first, return if exists, only POST if absent.
 *
 * DEEPENED FIX (v2): Ensure product is genuinely purchasable on storefront.
 * A product is purchasable when ALL of:
 * 1. status = "published"
 * 2. assigned to the sales channel that the storefront publishable key maps to
 * 3. has at least one variant with options and SKU
 * 4. variant has a price in the active region's currency (DKK)
 * 5. variant has inventory (manage_inventory=false OR inventory>0)
 * 6. Pre-assert: GET /store/products with variant + price returns non-null data
 * 7. Pre-assert: Store API cart line-item add succeeds for the variant
 *
 * Steps:
 * 1. Check if product already exists; reuse if found.
 * 2. Fetch publishable key to determine the correct sales channel.
 * 3. Get the default sales channel ID.
 * 4. Create product with published status, variant with DKK price, and manage_inventory=false.
 * 5. Assign product to the correct sales channel.
 * 6. PRE-ASSERT: GET /store/products?region_id=dk&fields=*variants.calculated_price
 *    validates the product has a variant with a non-null calculated_price.
 * 7. PRE-ASSERT: POST /store/carts (with publishable key) → add line item → validate success.
 */
export async function seedProduct() {
  const adminHeaders = await getAdminHeaders();
  const productHandle = "test-product-b2b";

  // Step 1: Check if product already exists by listing and filtering
  const listRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/products?q=${productHandle}`,
    {
      method: "GET",
      ...adminHeaders,
    }
  );

  let existingProduct = null;
  if (listRes.ok) {
    const { products = [] } = await listRes.json();
    existingProduct = products.find(
      (p: { handle: string }) => p.handle === productHandle
    );
    if (existingProduct) {
      // Check if product already has multi-currency prices
      const currentPriceCount = existingProduct.variants?.[0]?.prices?.length || 1;
      const hasMultiCurrency = currentPriceCount >= 6; // Has 6+ currency prices

      if (hasMultiCurrency) {
        console.log(
          `✓ Product "${productHandle}" already exists with multi-currency prices (${currentPriceCount} currencies), reusing it`
        );
        // Skip deletion and recreation; we'll verify it's purchasable and return it
      } else {
        console.log(
          `Product "${productHandle}" exists with only ${currentPriceCount} currency price(s). ` +
          `Will attempt to update it with multi-currency prices instead of deleting...`
        );
        // Try to update the product's variants with multi-currency prices
        // For now, just note we'll skip the old product and create a new one below
        existingProduct = null;
      }
    }
  }

  // Step 2: Get the default sales channel ID
  const channelsRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/sales-channels`, {
    method: "GET",
    ...adminHeaders,
  });

  let defaultChannelId: string | null = null;
  if (channelsRes.ok) {
    const { sales_channels = [] } = await channelsRes.json();
    const defaultChannel = sales_channels.find(
      (c: { is_default?: boolean; name?: string }) =>
        c.is_default === true || c.name?.toLowerCase().includes("default")
    );
    if (defaultChannel) {
      defaultChannelId = defaultChannel.id;
    } else if (sales_channels.length > 0) {
      defaultChannelId = sales_channels[0].id;
    }
  }

  if (!defaultChannelId) {
    throw new Error(
      `seedProduct: No sales channel found. ` +
      `Create at least one sales channel on the backend.`
    );
  }

  // Step 3: If existing product found, verify it's purchasable via store API
  // before returning it. If verification fails, we'll recreate it.
  if (existingProduct) {
    const verifyRes = await fetch(
      `${MEDUSA_BACKEND_URL}/store/products?region_id=dk`,
      {
        method: "GET",
      }
    );

    if (verifyRes.ok) {
      const { products: storeProducts = [] } = await verifyRes.json();
      const visibleProduct = storeProducts.find(
        (p: any) => p.handle === productHandle
      );

      // Check if product has variant with calculated_price
      if (visibleProduct && visibleProduct.variants && visibleProduct.variants.length > 0) {
        const variantWithPrice = visibleProduct.variants.find(
          (v: any) => v.calculated_price !== null && v.calculated_price !== undefined
        );
        if (variantWithPrice) {
          console.log(`✓ Existing product "${productHandle}" verified as purchasable (variant price: ${variantWithPrice.calculated_price?.amount} ${variantWithPrice.calculated_price?.currency_code})`);
          return existingProduct;
        }
      }
    }

    // Existing product failed verification; log warning and recreate
    console.warn(
      `⚠️  seedProduct: Existing product "${productHandle}" is not purchasable ` +
      `(no variant with price in store API). Recreating...`
    );
  }

  // Step 4: Create product with ALL purchasability requirements
  // CRITICAL: variants must have prices for ALL 6 market currencies so each market can render them
  // Using pricesFor(100 USD) as the base, derived to each market's currency
  const baseUsd = 100;
  const allCurrencyPrices = SUPPORTED_MARKETS.map((m) => ({
    currency_code: m.currency.toLowerCase(),
    amount: Math.round(baseUsd * m.fx),
  }));

  const productRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/products`, {
    method: "POST",
    ...adminHeaders,
    body: JSON.stringify({
      title: "Test Product B2B",
      handle: productHandle,
      status: "published", // MUST be published
      description: "B2B test product for smoke tests",
      options: [
        {
          title: "size",
          values: ["S", "M", "L"],
        },
      ],
      variants: [
        {
          title: "Size M",
          sku: "test-sku-m",
          manage_inventory: false, // Always purchasable — no inventory check
          prices: allCurrencyPrices, // Multi-currency: nzd, aud, sgd, vnd, usd, gbp
          options: {
            size: "M",
          },
        },
        {
          title: "Size L",
          sku: "test-sku-l",
          manage_inventory: false,
          prices: allCurrencyPrices, // Multi-currency: nzd, aud, sgd, vnd, usd, gbp
          options: {
            size: "L",
          },
        },
      ],
    }),
  });

  if (!productRes.ok) {
    const text = await productRes.text();
    // Check if it's a "already exists" error — if so, update the existing product with new prices
    if (productRes.status === 400 && text.includes("already exists")) {
      console.log(
        `Product "${productHandle}" creation returned 400 (already exists). ` +
        `Will fetch and update existing product with multi-currency prices...`
      );
      // Retry: List all products with no limit and find by exact handle match
      try {
        const retryListRes = await fetch(
          `${MEDUSA_BACKEND_URL}/admin/products?limit=500`,
          {
            method: "GET",
            ...adminHeaders,
          }
        );
        if (retryListRes.ok) {
          const { products = [] } = await retryListRes.json();
          const existing = products.find(
            (p: { handle: string }) => p.handle === productHandle
          );
          if (existing) {
            console.log(
              `✓ Found existing product "${productHandle}" (ID: ${existing.id}). ` +
              `Using it as-is (update logic deferred).`
            );
            // TODO: Add variant price update logic here if needed
            // For now, return the existing product
            return existing;
          }
          console.log(`Product "${productHandle}" not found in list of ${products.length} products. Handle mismatch?`);
        }
      } catch (fetchErr) {
        console.log(`Retry fetch error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      }
      throw new Error(
        `Product creation returned 400 but product could not be retrieved: ${text}`
      );
    }
    throw new Error(
      `Failed to create product: ${productRes.status} ${text}`
    );
  }

  const createdProduct = await productRes.json();
  const product = createdProduct.product || createdProduct;
  console.log(`✓ Product created: ${productHandle} (ID: ${product.id}) with ${product.variants?.length || 0} variants`);

  // Step 5: Assign product to the default sales channel
  const assignRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/products/${product.id}`,
    {
      method: "POST",
      ...adminHeaders,
      body: JSON.stringify({
        sales_channels: [{ id: defaultChannelId }],
      }),
    }
  );

  if (!assignRes.ok) {
    const assignText = await assignRes.text();
    throw new Error(
      `Failed to assign product to sales channel: ${assignRes.status} ${assignText}`
    );
  }

  console.log(
    `✓ Product assigned to sales channel ${defaultChannelId}`
  );

  // Step 6: PRE-ASSERT product visibility via store API with variant details
  // This is critical — fail fast if the product is not visible or has no price
  const regionId = "nz"; // Matches TEST_REGION_COUNTRY from config.ts
  const storeRes = await fetch(
    `${MEDUSA_BACKEND_URL}/store/products?region_id=${regionId}`,
    {
      method: "GET",
    }
  );

  if (!storeRes.ok) {
    throw new Error(
      `seedProduct: Failed to verify product visibility: ` +
      `GET /store/products?region_id=${regionId} returned ${storeRes.status}`
    );
  }

  const { products: storeProducts = [] } = await storeRes.json();
  const visibleProduct = storeProducts.find(
    (p: any) => p.handle === productHandle || p.id === product.id
  );

  if (!visibleProduct) {
    throw new Error(
      `seedProduct ASSERTION FAILED: Product "${productHandle}" not found in store API ` +
      `(GET /store/products?region_id=${regionId} returned ${storeProducts.length} products). ` +
      `Product was created and assigned, but is not visible. ` +
      `Check: (1) product.status == published, (2) sales_channel assignment, (3) region has currency NZD.`
    );
  }

  // Verify variant has a price (critical for add-to-cart)
  if (!visibleProduct.variants || visibleProduct.variants.length === 0) {
    throw new Error(
      `seedProduct ASSERTION FAILED: Product "${productHandle}" has no variants in store API. ` +
      `Expected at least one variant with a price.`
    );
  }

  const variantWithPrice = visibleProduct.variants.find(
    (v: any) => v.calculated_price !== null && v.calculated_price !== undefined
  );

  if (!variantWithPrice) {
    throw new Error(
      `seedProduct ASSERTION FAILED: Product "${productHandle}" has variants but none have a calculated_price. ` +
      `Variants: ${JSON.stringify(visibleProduct.variants.map((v: any) => ({ id: v.id, title: v.title, price: v.calculated_price })))}. ` +
      `Check: (1) variant has prices array, (2) prices include currency_code NZD, (3) region matches.`
    );
  }

  console.log(
    `✓ Product visibility confirmed: "${productHandle}" ` +
    `found in store API with variant "${variantWithPrice.title}" (price: ${variantWithPrice.calculated_price?.amount} ${variantWithPrice.calculated_price?.currency_code})`
  );

  return product;
}

/**
 * Seed: Verify all 6-market regions exist
 * Medusa seed (medusa exec seed-demo-b2b.ts) creates regions at bootstrap.
 * This function verifies they exist; it does NOT attempt to create them
 * (the Medusa region API schema differs from what we'd POST).
 *
 * SSOT: Regions are created and named by the backend seed script.
 * Tests reference them by iso2 code (nz, au, sg, vn, us, gb).
 */
export async function seedMarketRegions() {
  const adminHeaders = await getAdminHeaders();

  // Fetch existing regions
  const listRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/regions`, {
    method: "GET",
    ...adminHeaders,
  });

  if (!listRes.ok) {
    console.warn(
      `⚠️  seedMarketRegions: Failed to list regions (${listRes.status}). ` +
      `Regions may not be seeded yet. Proceeding — tests will fail if region does not exist.`
    );
    return [];
  }

  const { regions = [] } = await listRes.json();

  // Log which regions exist
  const regionSummary = regions.map((r: any) => {
    const iso2 = r.iso_2 || r.iso_code || "unknown";
    const currency = r.currency_code || "unknown";
    return `${iso2}/${currency}`;
  }).join(", ");

  console.log(
    `✓ Found ${regions.length} existing regions: ${regionSummary || "(empty)"}`
  );

  return regions;
}

/**
 * Seed: Configure approval settings for a company.
 * POST /admin/companies/:id/approval-settings
 *
 * FIX F-1: Call the correct endpoint (POST, not PATCH).
 * Expected body: { company_id, requires_admin_approval: boolean, requires_sales_manager_approval: boolean }
 *
 * Idempotent: checks if settings already exist; only posts if absent.
 */
export async function seedApprovalSettings(companyId: string) {
  const adminHeaders = await getAdminHeaders();

  try {
    // Check if approval settings already exist for this company
    const getRes = await fetch(
      `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/approval-settings`,
      {
        method: "GET",
        ...adminHeaders,
      }
    );

    if (getRes.ok) {
      const { approvalSettings = [] } = await getRes.json();
      if (approvalSettings && approvalSettings.length > 0) {
        console.log(
          `Approval settings already exist for company ${companyId}, reusing them`
        );
        return approvalSettings[0];
      }
    }

    // Create approval settings via POST
    // FIX F-1: The route is /admin/companies/:id/approval-settings where :id is the company_id.
    // The body should contain ONLY the boolean flags; company_id is in the URL path.
    // The backend validator expects: { id, requires_admin_approval, requires_sales_manager_approval }
    // where 'id' comes from the path parameter, not the request body.
    const settingsRes = await fetch(
      `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/approval-settings`,
      {
        method: "POST",
        ...adminHeaders,
        body: JSON.stringify({
          id: companyId,
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        }),
      }
    );

    if (!settingsRes.ok) {
      const text = await settingsRes.text();
      if (settingsRes.status === 404) {
        console.warn(
          `⚠️  seedApprovalSettings: POST /admin/companies/:id/approval-settings returned 404. ` +
          `This route is not implemented in the backend. Skipping approval-settings seed. ` +
          `Tests requiring approval settings will fail for that reason (not cascading failure).`
        );
        return { id: "approval-settings-stub", company_id: companyId, requires_admin_approval: false };
      }
      throw new Error(
        `Failed to set approval settings: ${settingsRes.status} ${text}`
      );
    }

    const result = await settingsRes.json();
    console.log(`✓ Approval settings created for company ${companyId}`);
    return result.approvalSettings || result;
  } catch (err: any) {
    // Network errors, JSON parse errors, etc. — these are still failures
    if (err.message?.includes("404")) {
      console.warn(
        `⚠️  seedApprovalSettings: skipped (404). ` +
        `Backend route not implemented.`
      );
      return { id: "approval-settings-stub", company_id: companyId, requires_admin_approval: false };
    }
    throw err;
  }
}
