const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.local";
const TEST_ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD || "Test1234!";

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
 */
export async function seedCompany() {
  const adminHeaders = await getAdminHeaders();

  const companyRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/companies`, {
    method: "POST",
    ...adminHeaders,
    body: JSON.stringify({
      name: "OceanSoft Test Corp",
      email: "contact@oceansoft-test.local",
      phone: "+45 12 34 56 78",
      address: "123 Test Street",
      city: "Copenhagen",
      state: "DK",
      zip: "1000",
      country: "Denmark",
      currency_code: "DKK",
      spending_limit_reset_frequency: "monthly",
    }),
  });

  if (!companyRes.ok) {
    const text = await companyRes.text();
    throw new Error(
      `Failed to create company: ${companyRes.status()} ${text}`
    );
  }

  const company = await companyRes.json();
  return company;
}

/**
 * Seed: Create employee (buyer) within a company.
 * POST /admin/employees or /admin/users scoped to company.
 */
export async function seedEmployee(companyId: string) {
  const adminHeaders = await getAdminHeaders();

  const employeeRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/employees`,
    {
      method: "POST",
      ...adminHeaders,
      body: JSON.stringify({
        email: "buyer@oceansoft.test",
        password: "BuyerPassword123!",
        first_name: "Test",
        last_name: "Buyer",
        spending_limit: 50000,
        spending_limit_reset_frequency: "monthly",
      }),
    }
  );

  if (!employeeRes.ok()) {
    const text = await employeeRes.text();
    throw new Error(
      `Failed to create employee: ${employeeRes.status()} ${text}`
    );
  }

  return await employeeRes.json();
}

/**
 * Seed: Create a product for the store.
 * POST /admin/products
 */
export async function seedProduct() {
  const adminHeaders = await getAdminHeaders();

  const productRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/products`, {
    method: "POST",
    ...adminHeaders,
    body: JSON.stringify({
      title: "Test Product B2B",
      handle: "test-product-b2b",
      status: "published",
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
          manage_inventory: false,
          prices: [
            {
              currency_code: "dkk",
              amount: 10000, // 100 DKK
            },
          ],
          options: {
            size: "M",
          },
        },
      ],
    }),
  });

  if (!productRes.ok()) {
    const text = await productRes.text();
    throw new Error(
      `Failed to create product: ${productRes.status()} ${text}`
    );
  }

  return await productRes.json();
}

/**
 * Seed: Configure approval settings for a company.
 * PATCH /admin/companies/:id/settings
 */
export async function seedApprovalSettings(companyId: string) {
  const adminHeaders = await getAdminHeaders();

  const settingsRes = await fetch(
    `${MEDUSA_BACKEND_URL}/admin/companies/${companyId}/settings`,
    {
      method: "PATCH",
      ...adminHeaders,
      body: JSON.stringify({
        requires_approval: true,
        approval_threshold: 5000, // Approve orders over 5000 DKK
      }),
    }
  );

  if (!settingsRes.ok()) {
    const text = await settingsRes.text();
    throw new Error(
      `Failed to set approval settings: ${settingsRes.status()} ${text}`
    );
  }

  return await settingsRes.json();
}
