import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { adminHeaders, createAdminUser, createStoreUser } from "../../utils/admin";
import { cartSeeder, productSeeder, regionSeeder, salesChannelSeeder } from "../../utils/seeder";
import { generatePublishableKey, generateStoreHeaders } from "../../utils/store";

// 300s: medusaIntegrationTestRunner in-app boot ~60-70s on local Docker (PDCA 2026-06-04)
jest.setTimeout(300 * 1000);

/**
 * RQ2 — Spending-limit & authorization NEGATIVE suite (B2B-specific defects).
 *
 * Four boundary/authz cases on REAL server responses (medusaIntegrationTestRunner
 * inApp:true) — no mock-circular-validation:
 *   N01 Unauthenticated POST /store/companies            -> 401
 *   N02 Employee spending_limit < cart total             -> complete blocked (/spending limit/)
 *   N03 Approval-required + pending approval on cart      -> complete blocked (/pending approval/)
 *   N04 Cross-company read by an outsider customer        -> 403/404 (not their company)
 *
 * Routes verified against apps/backend/src/api/store/* (companies, employees,
 * approval-settings, carts/:id/approvals all exist).
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: { JWT_SECRET: "supersecret" },
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: any, region: any, salesChannel: any, product: any;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const pk = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey: pk });
      const res = await createStoreUser({ api, storeHeaders });
      storeHeaders.headers["Authorization"] = `Bearer ${res.token}`;
      region = await regionSeeder({ api, adminHeaders, data: {} });
      salesChannel = await salesChannelSeeder({ api, adminHeaders, data: {} });
      product = await productSeeder({ api, adminHeaders, data: { sales_channels: [{ id: salesChannel.id }] } });
      await api.post(`/admin/api-keys/${pk.id}/sales-channels`, { add: [salesChannel.id] }, adminHeaders);
    });

    describe("N01 — unauthenticated access (buyer-employee / Control pillar)", () => {
      it("rejects POST /store/companies with no bearer token", async () => {
        const unauth = { headers: { ...storeHeaders.headers } };
        delete unauth.headers["Authorization"];
        const { response } = await api
          .post("/store/companies", { name: "Unauth Co", email: "u@test.com", currency_code: "usd" }, unauth)
          .catch((e: any) => e);
        expect(response.status).toBe(401);
      });
    });

    describe("N02 — spending-limit enforcement (buyer-employee / Control pillar)", () => {
      it("blocks cart completion when employee spending_limit < cart total", async () => {
        const { data: { companies } } = await api.post(
          "/store/companies",
          { name: "Limit Corp", email: "limit@corp.com", currency_code: "usd" },
          storeHeaders
        );
        const company = companies[0];
        const me = (await api.get("/store/customers/me", storeHeaders)).data.customer;
        await api.post(
          `/store/companies/${company.id}/employees`,
          { customer_id: me.id, spending_limit: 1, is_admin: false },
          storeHeaders
        );
        const cart = await cartSeeder({
          api, storeHeaders,
          data: { region_id: region.id, sales_channel_id: salesChannel.id, items: [{ quantity: 1, variant_id: product.variants[0].id }] },
        });
        await api.post(
          `/store/carts/${cart.id}`,
          { email: "limit@corp.com", shipping_address: { address_1: "1 Test St", city: "Test", country_code: "us", postal_code: "00001" } },
          storeHeaders
        );
        const { response } = await api.post(`/store/carts/${cart.id}/complete`, {}, storeHeaders).catch((e: any) => e);
        expect(response.status).toBeGreaterThanOrEqual(400);
        const body = response.data ?? {};
        const msg: string = body.message ?? body.error ?? JSON.stringify(body);
        expect(msg.toLowerCase()).toMatch(/spending limit/i);
      });
    });

    describe("N03 — approval-required enforcement (admin/sales-manager / Compliance pillar)", () => {
      it("blocks cart completion while an approval is pending", async () => {
        const { data: { companies } } = await api.post(
          "/store/companies",
          { name: "Approval Corp", email: "approval@corp.com", currency_code: "usd" },
          storeHeaders
        );
        const company = companies[0];
        await api.post(`/store/companies/${company.id}/approval-settings`, { requires_admin_approval: true }, storeHeaders);
        const cart = await cartSeeder({
          api, storeHeaders,
          data: { region_id: region.id, sales_channel_id: salesChannel.id, items: [{ quantity: 1, variant_id: product.variants[0].id }] },
        });
        await api.post(`/store/carts/${cart.id}/approvals`, {}, storeHeaders).catch((e: any) => e);
        const { response } = await api.post(`/store/carts/${cart.id}/complete`, {}, storeHeaders).catch((e: any) => e);
        expect(response.status).toBeGreaterThanOrEqual(400);
        const body = response.data ?? {};
        const msg: string = body.message ?? body.error ?? JSON.stringify(body);
        expect(msg.toLowerCase()).toMatch(/approval/i);
      });
    });

    describe("N04 — cross-company access control (finance/auditability / Compliance pillar)", () => {
      it("denies an outsider customer reading a company they do not belong to", async () => {
        const { data: { companies } } = await api.post(
          "/store/companies",
          { name: "Company Alpha", email: "alpha@corp.com", currency_code: "usd" },
          storeHeaders
        );
        const companyA = companies[0];
        const pkB = await generatePublishableKey(getContainer());
        const headersB = generateStoreHeaders({ publishableKey: pkB });
        const regTokenB = (await api.post("/auth/customer/emailpass/register", { email: "b@test.com", password: "pwd-b" })).data.token;
        await api.post("/store/customers", { email: "b@test.com" }, { headers: { Authorization: `Bearer ${regTokenB}`, ...headersB.headers } });
        const tokenB = (await api.post("/auth/customer/emailpass", { email: "b@test.com", password: "pwd-b" })).data.token;
        (headersB.headers as any)["Authorization"] = `Bearer ${tokenB}`;
        const { response } = await api.get(`/store/companies/${companyA.id}`, headersB).catch((e: any) => e);
        expect([403, 404]).toContain(response.status);
      });
    });
  },
});
