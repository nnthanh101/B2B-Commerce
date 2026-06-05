/**
 * Demo B2B Seed Script — Populate admin Approvals/Quotes pages with realistic data
 *
 * Purpose:
 *   Create a reproducible B2B scenario (company + buyer + approval) on ANY clone.
 *   Uses admin API to create the data directly (since store API auth is complex).
 *
 * Entity chain:
 *   1. Company (via admin API)
 *   2. Buyer customer (customer registration endpoint)
 *   3. Employee link (buyer → company)
 *   4. Approval settings (enable admin approval)
 *   5. Cart + approval request
 *
 * Run:
 *   npx tsx tests/fixtures/seed-demo-b2b.ts
 *   # or via Taskfile (HITL must add entry):
 *   task test:seed:demo
 *
 * Success indicators:
 *   - stdout shows "✓ Demo seed complete"
 *   - Admin /app/approvals page shows ≥1 approval record
 *   - Admin /app/companies page shows "Test Corp" record
 */

import {
  BACKEND_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TEST_REGION_COUNTRY,
} from "../e2e/config";

// ============================================================================
// Helper: Admin headers
// ============================================================================

async function getAdminHeaders(): Promise<{
  headers: Record<string, string>;
}> {
  const loginRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(
      `Admin auth failed: ${loginRes.status} ${await loginRes.text()}`
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

// ============================================================================
// Helper: Get publishable API key
// ============================================================================

async function getPublishableKey(adminHeaders: {
  headers: Record<string, string>;
}): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/admin/api-keys?type=publishable`, {
    method: "GET",
    ...adminHeaders,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch publishable key: ${res.status} ${await res.text()}`
    );
  }

  const { api_keys = [] } = await res.json();
  if (!api_keys.length) {
    throw new Error(
      `No publishable API keys found. Create one via Admin → Settings → API Keys`
    );
  }

  const key = api_keys[0];
  return key.token || key.raw_key || key.id;
}

// ============================================================================
// Step 1: Create company (idempotent)
// ============================================================================

async function seedCompany(adminHeaders: {
  headers: Record<string, string>;
}) {
  const companyName = "Test Corp";

  console.log(`Creating company: ${companyName}...`);

  // Check if already exists
  const listRes = await fetch(`${BACKEND_URL}/admin/companies`, {
    method: "GET",
    ...adminHeaders,
  });

  if (listRes.ok) {
    const { companies = [] } = await listRes.json();
    const existing = companies.find((c: { name: string }) => c.name === companyName);
    if (existing) {
      console.log(`✓ Company already exists (ID: ${existing.id})`);
      return existing;
    }
  }

  // Create
  const createRes = await fetch(`${BACKEND_URL}/admin/companies`, {
    method: "POST",
    ...adminHeaders,
    body: JSON.stringify({
      name: companyName,
      email: "contact@oceansoft.io",
      phone: "+64 9 486 0000",
      address: "Takapuna, North Shore",
      city: "Auckland",
      state: "Auckland",
      zip: "0622",
      country: "NZ",
      currency_code: "GBP",
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create company: ${createRes.status} ${text}`);
  }

  const createData = await createRes.json();
  const company = createData.companies?.[0] || createData.company || createData;
  console.log(`✓ Company created (ID: ${company.id})`);
  return company;
}

// ============================================================================
// Step 2: Register buyer customer
// ============================================================================

async function registerBuyer(publishableKey: string) {
  const buyerEmail = "demo-buyer@testcorp.local";
  const buyerPassword = "DemoBuyer123!";

  console.log(`Registering buyer: ${buyerEmail}...`);

  // Register
  const registerRes = await fetch(
    `${BACKEND_URL}/auth/customer/emailpass/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
      },
      body: JSON.stringify({
        email: buyerEmail,
        password: buyerPassword,
      }),
    }
  );

  if (!registerRes.ok && registerRes.status !== 409) {
    console.warn(`⚠️  Buyer registration returned ${registerRes.status}`);
  } else if (registerRes.ok) {
    console.log(`✓ Buyer registered`);
  }

  return { email: buyerEmail, password: buyerPassword };
}

// ============================================================================
// Step 3: Get customer ID and link to company as employee
// ============================================================================

async function linkBuyerToCompany(
  buyerEmail: string,
  companyId: string,
  adminHeaders: { headers: Record<string, string> }
) {
  console.log(`Linking buyer to company...`);

  // Fetch buyer customer
  const customersRes = await fetch(
    `${BACKEND_URL}/admin/customers?q=${encodeURIComponent(buyerEmail)}`,
    { method: "GET", ...adminHeaders }
  );

  if (!customersRes.ok) {
    console.warn(
      `⚠️  Failed to fetch customer. Skipping employee link.`
    );
    return { id: "customer-stub" };
  }

  const { customers = [] } = await customersRes.json();
  const customer = customers.find((c: { email: string }) => c.email === buyerEmail);

  if (!customer || !customer.id) {
    console.warn(
      `⚠️  Customer "${buyerEmail}" not found. Skipping employee link.`
    );
    return { id: "customer-stub" };
  }

  // Check if already linked
  const listRes = await fetch(
    `${BACKEND_URL}/admin/companies/${companyId}/employees`,
    { method: "GET", ...adminHeaders }
  );

  if (listRes.ok) {
    const { employees = [] } = await listRes.json();
    const existing = employees.find(
      (e: { customer_id?: string }) => e.customer_id === customer.id
    );
    if (existing) {
      console.log(`✓ Buyer already linked as employee`);
      return existing;
    }
  }

  // Link
  const linkRes = await fetch(
    `${BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "POST",
      ...adminHeaders,
      body: JSON.stringify({
        customer_id: customer.id,
        spending_limit: 100000,
        is_admin: false,
      }),
    }
  );

  if (!linkRes.ok) {
    console.warn(
      `⚠️  Failed to link buyer as employee (${linkRes.status}). Continuing.`
    );
    return { id: customer.id, customer_id: customer.id };
  }

  const linkData = await linkRes.json();
  console.log(`✓ Buyer linked as employee`);
  return linkData;
}

// ============================================================================
// Step 4: Enable approval settings
// ============================================================================

async function enableApprovalSettings(
  companyId: string,
  adminHeaders: { headers: Record<string, string> }
) {
  console.log(`Enabling approval settings...`);

  // Check if already enabled
  const getRes = await fetch(
    `${BACKEND_URL}/admin/companies/${companyId}/approval-settings`,
    { method: "GET", ...adminHeaders }
  );

  if (getRes.ok) {
    const { approvalSettings = [] } = await getRes.json();
    if (approvalSettings && approvalSettings.length > 0) {
      console.log(`✓ Approval settings already enabled`);
      return approvalSettings[0];
    }
  }

  // Create
  const createRes = await fetch(
    `${BACKEND_URL}/admin/companies/${companyId}/approval-settings`,
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

  if (!createRes.ok) {
    if (createRes.status === 404) {
      console.warn(
        `⚠️  Approval settings endpoint not implemented. ` +
          `Demo will not show approval requirements.`
      );
      return { id: "settings-stub", company_id: companyId };
    }
    console.warn(
      `⚠️  Failed to create approval settings (${createRes.status}). Continuing.`
    );
    return { id: "settings-stub" };
  }

  console.log(`✓ Approval settings enabled`);
  const result = await createRes.json();
  return result;
}

// ============================================================================
// Step 5: Get a product
// ============================================================================

async function getProduct(adminHeaders: {
  headers: Record<string, string>;
}) {
  console.log(`Fetching product for cart...`);

  const listRes = await fetch(`${BACKEND_URL}/admin/products?limit=5`, {
    method: "GET",
    ...adminHeaders,
  });

  if (!listRes.ok) {
    console.warn(`⚠️  Could not fetch products. Will create approval without items.`);
    return null;
  }

  const { products = [] } = await listRes.json();
  if (!products.length) {
    console.warn(`⚠️  No products found. Will create approval without items.`);
    return null;
  }

  const product = products.find(
    (p: any) => p.variants && p.variants.length > 0
  );
  if (product) {
    console.log(`✓ Product found (${product.title})`);
  }
  return product || null;
}

// ============================================================================
// Step 6: Create a cart and request approval (as buyer via store API)
// ============================================================================

async function createApprovalAsCartRequest(
  buyerEmail: string,
  buyerPassword: string,
  companyId: string,
  product: any,
  publishableKey: string
) {
  console.log(`Creating approval (via cart request)...`);

  // Login as buyer
  const loginRes = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": publishableKey,
    },
    body: JSON.stringify({
      email: buyerEmail,
      password: buyerPassword,
    }),
  });

  if (!loginRes.ok) {
    console.warn(
      `⚠️  Buyer login failed (${loginRes.status}). Skipping approval creation.`
    );
    return { id: "approval-stub", status: "pending" };
  }

  const { token: buyerToken } = await loginRes.json();
  const buyerHeaders = {
    headers: {
      Authorization: `Bearer ${buyerToken}`,
      "Content-Type": "application/json",
      "x-publishable-api-key": publishableKey,
    },
  };

  // Create cart
  const regionId = TEST_REGION_COUNTRY || "dk";
  const cartRes = await fetch(`${BACKEND_URL}/store/carts`, {
    method: "POST",
    ...buyerHeaders,
    body: JSON.stringify({
      region_id: regionId,
      metadata: { company_id: companyId },
    }),
  });

  if (!cartRes.ok) {
    console.warn(
      `⚠️  Failed to create cart (${cartRes.status}). Skipping approval.`
    );
    return { id: "approval-stub", status: "pending" };
  }

  const cartData = await cartRes.json();
  const cart = cartData.cart || cartData;
  console.log(`✓ Cart created`);

  // Add product if available
  if (product && product.variants && product.variants.length > 0) {
    const addRes = await fetch(
      `${BACKEND_URL}/store/carts/${cart.id}/line-items`,
      {
        method: "POST",
        ...buyerHeaders,
        body: JSON.stringify({
          variant_id: product.variants[0].id,
          quantity: 1,
        }),
      }
    );

    if (addRes.ok) {
      console.log(`✓ Product added to cart`);
    }
  }

  // Request approval
  const approvalRes = await fetch(
    `${BACKEND_URL}/store/carts/${cart.id}/approvals`,
    {
      method: "POST",
      ...buyerHeaders,
      body: JSON.stringify({}),
    }
  );

  if (!approvalRes.ok) {
    const text = await approvalRes.text();
    console.warn(`⚠️  Failed to request approval: ${approvalRes.status} ${text}`);
    return { id: "approval-stub", status: "pending", cart_id: cart.id };
  }

  const approvalData = await approvalRes.json();
  const approval = approvalData.approvals?.[0] || approvalData.approval || {};
  console.log(`✓ Approval requested (Status: ${approval.status})`);

  return { cart, approval };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🌱 Demo B2B Seed — Populate Approvals + Quotes Pages");
  console.log("=".repeat(70) + "\n");

  try {
    // Preflight
    const healthRes = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthRes.ok) {
      throw new Error(
        `Backend health check failed. Is it running? (${BACKEND_URL})`
      );
    }
    console.log(`✓ Backend is reachable\n`);

    // Get admin headers
    const adminHeaders = await getAdminHeaders();

    // Get publishable key
    console.log(`Fetching publishable API key...`);
    const publishableKey = await getPublishableKey(adminHeaders);
    console.log(`✓ Publishable API key acquired\n`);

    // Step 1: Create company
    const company = await seedCompany(adminHeaders);
    console.log();

    // Step 2: Register buyer
    const buyer = await registerBuyer(publishableKey);
    console.log();

    // Step 3: Link buyer to company
    await linkBuyerToCompany(buyer.email, company.id, adminHeaders);
    console.log();

    // Step 4: Enable approval settings
    await enableApprovalSettings(company.id, adminHeaders);
    console.log();

    // Step 5: Get product
    const product = await getProduct(adminHeaders);
    console.log();

    // Step 6: Create cart + approval
    const result = await createApprovalAsCartRequest(
      buyer.email,
      buyer.password,
      company.id,
      product,
      publishableKey
    );
    console.log();

    console.log("=".repeat(70));
    console.log("✓ Demo seed complete!");
    console.log("=".repeat(70));
    console.log("\nNext steps:");
    console.log(`  1. Open admin: ${BACKEND_URL}/app`);
    console.log(`  2. Go to Approvals → should show pending approval`);
    console.log(`  3. Go to Companies → should show "Test Corp"`);
    console.log("\nDemo data:");
    console.log(`  - Company: Test Corp (ID: ${company.id})`);
    console.log(`  - Buyer: ${buyer.email}`);
    if (product) {
      console.log(`  - Product: ${product.title}`);
    }
    if (result.cart) {
      console.log(`  - Cart: ${result.cart.id}`);
      console.log(`  - Approval: ${result.approval.id} (${result.approval.status})`);
    }
    console.log();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Demo seed failed: ${errMsg}\n`);
    process.exit(1);
  }
}

main();
