/**
 * Integration tests for approvals -- live HTTP calls against Medusa.
 * Run via: task test:integration  (TEST_TYPE=integration:http jest --runInBand --forceExit)
 * Database: clean, ephemeral (tmpfs in docker-compose.test.yml)
 *
 * Domain coverage (plan section 8, line 110 -- v1.1.1 DC-INT-FULL will fill these):
 *   A01  GET  /store/approvals              -- list approvals for company admin
 *   A02  POST /store/approvals/:id          -- update approval status (approved / rejected)
 *   A03  POST /store/carts/:id/approvals    -- request approval for a cart
 *   A04  POST /admin/approvals/:id          -- admin approve/reject (audit trail)
 *   A05  POST /store/companies/:id/approval-settings -- configure requires_admin_approval
 *
 * Negative cases (plan section 8, RQ2 boundary):
 *   AN01 POST /store/approvals/:id with invalid status -> 400
 *   AN02 POST /store/carts/:id/approvals when approval already pending -> idempotent / 409
 *
 * Prerequisite sequence per test:
 *   1. Create company (POST /store/companies)
 *   2. Enable approval-required (POST /store/companies/:id/approval-settings)
 *   3. Create cart (cartSeeder)
 *   4. Request approval (POST /store/carts/:id/approvals)
 *   5. Assert approval record created (GET /store/approvals)
 *   6. Admin approves / rejects (POST /admin/approvals/:id or /store/approvals/:id)
 *   7. Assert audit trail state
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { adminHeaders, createAdminUser, createStoreUser } from "../../utils/admin";
import { cartSeeder, productSeeder, regionSeeder, salesChannelSeeder } from "../../utils/seeder";
import { generatePublishableKey, generateStoreHeaders } from "../../utils/store";

// 300s: medusaIntegrationTestRunner in-app boot ~60-70s on local Docker (PDCA 2026-06-04)
jest.setTimeout(300 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: { JWT_SECRET: "supersecret" },
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: any, region: any, salesChannel: any, product: any, customer: any;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const pk = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey: pk });
      const res = await createStoreUser({ api, storeHeaders });
      customer = res.customer;
      (storeHeaders.headers as any)["Authorization"] = `Bearer ${res.token}`;
      region = await regionSeeder({ api, adminHeaders, data: {} });
      salesChannel = await salesChannelSeeder({ api, adminHeaders, data: {} });
      product = await productSeeder({
        api,
        adminHeaders,
        data: { sales_channels: [{ id: salesChannel.id }] },
      });
      await api.post(
        `/admin/api-keys/${pk.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders
      );
    });

    // -------------------------------------------------------------------------
    // Helper: create a company, link the store customer as admin employee,
    // then enable requires_admin_approval, and create + request approval on cart.
    // Returns { company, cart, approval }
    // -------------------------------------------------------------------------
    async function setupPendingApproval() {
      const {
        data: { companies },
      } = await api.post(
        "/store/companies",
        { name: "Test Company", email: "co@test.com", currency_code: "usd" },
        storeHeaders
      );
      const company = companies[0];

      // Link the authenticated customer as an admin employee so GET /store/approvals resolves company
      await api.post(
        `/store/companies/${company.id}/employees`,
        { customer_id: customer.id, is_admin: true },
        storeHeaders
      );

      // Enable admin approval gate
      await api.post(
        `/store/companies/${company.id}/approval-settings`,
        { requires_admin_approval: true },
        storeHeaders
      );

      const cart = await cartSeeder({
        api,
        storeHeaders,
        data: {
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          items: [{ quantity: 1, variant_id: product.variants[0].id }],
          metadata: { company_id: company.id },
        },
      });

      const {
        data: { approvals },
      } = await api.post(`/store/carts/${cart.id}/approvals`, {}, storeHeaders);

      return { company, cart, approval: approvals[0] };
    }

    // =========================================================================
    // A05 — Approval settings toggle
    // =========================================================================
    describe("Approval settings -- POST /store/companies/:id/approval-settings", () => {
      it("enables and then disables requires_admin_approval", async () => {
        const {
          data: { companies },
        } = await api.post(
          "/store/companies",
          { name: "Settings Co", email: "sc@test.com", currency_code: "usd" },
          storeHeaders
        );
        const company = companies[0];

        // Link customer as employee so ensureCompanyMember passes on GET
        await api.post(
          `/store/companies/${company.id}/employees`,
          { customer_id: customer.id, is_admin: true },
          storeHeaders
        );

        // Enable
        const enableRes = await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: true },
          storeHeaders
        );
        expect(enableRes.status).toEqual(201);

        // Verify reflected in GET
        const {
          data: { company: fetched1 },
        } = await api.get(`/store/companies/${company.id}`, storeHeaders);
        expect(fetched1.approval_settings.requires_admin_approval).toBe(true);

        // Disable
        const disableRes = await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: false },
          storeHeaders
        );
        expect(disableRes.status).toEqual(201);

        const {
          data: { company: fetched2 },
        } = await api.get(`/store/companies/${company.id}`, storeHeaders);
        expect(fetched2.approval_settings.requires_admin_approval).toBe(false);
      });
    });

    // =========================================================================
    // A03 — Request approval for a cart
    // =========================================================================
    describe("Approval request -- POST /store/carts/:id/approvals", () => {
      it("creates a pending approval for the cart", async () => {
        const {
          data: { companies },
        } = await api.post(
          "/store/companies",
          { name: "Req Co", email: "rq@test.com", currency_code: "usd" },
          storeHeaders
        );
        const company = companies[0];

        await api.post(
          `/store/companies/${company.id}/employees`,
          { customer_id: customer.id, is_admin: true },
          storeHeaders
        );
        await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: true },
          storeHeaders
        );

        const cart = await cartSeeder({
          api,
          storeHeaders,
          data: {
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            items: [{ quantity: 1, variant_id: product.variants[0].id }],
            metadata: { company_id: company.id },
          },
        });

        const { status, data } = await api.post(
          `/store/carts/${cart.id}/approvals`,
          {},
          storeHeaders
        );

        expect(status).toEqual(200);
        expect(data.approvals).toBeInstanceOf(Array);
        expect(data.approvals.length).toBeGreaterThan(0);
        expect(data.approvals[0]).toMatchObject({
          cart_id: cart.id,
          status: "pending",
        });
      });
    });

    // =========================================================================
    // A01 — List approvals (GET /store/approvals)
    // =========================================================================
    describe("List approvals -- GET /store/approvals", () => {
      it("returns carts_with_approvals containing the pending cart", async () => {
        const { cart } = await setupPendingApproval();

        const { status, data } = await api.get("/store/approvals", storeHeaders);

        expect(status).toEqual(200);
        expect(data.carts_with_approvals).toBeInstanceOf(Array);
        const cartIds = data.carts_with_approvals.map((c: any) => c.id);
        expect(cartIds).toContain(cart.id);
      });
    });

    // =========================================================================
    // A02 — Store-side update approval (POST /store/approvals/:id)
    // =========================================================================
    describe("Update approval -- POST /store/approvals/:id", () => {
      it("approves a pending approval and status reflects approved", async () => {
        const { approval } = await setupPendingApproval();

        const { status, data } = await api.post(
          `/store/approvals/${approval.id}`,
          { status: "approved" },
          storeHeaders
        );

        expect(status).toEqual(200);
        expect(data.approval).toMatchObject({
          id: approval.id,
          status: "approved",
        });
      });

      it("AN01: rejects an invalid status value with 400", async () => {
        const { approval } = await setupPendingApproval();

        const errResponse = await api
          .post(
            `/store/approvals/${approval.id}`,
            { status: "invalid_value" },
            storeHeaders
          )
          .catch((e: any) => e);

        const responseStatus =
          errResponse?.response?.status ?? errResponse?.status;
        expect(responseStatus).toEqual(400);
      });
    });

    // =========================================================================
    // A04 — Admin approve/reject (POST /admin/approvals/:id)
    // =========================================================================
    describe("Admin approve/reject -- POST /admin/approvals/:id", () => {
      it("admin approves a pending approval and handled_by is populated", async () => {
        const { approval } = await setupPendingApproval();

        const result = await api
          .post(
            `/admin/approvals/${approval.id}`,
            { status: "approved" },
            adminHeaders
          )
          .catch((e: any) => e);

        expect(result.status).toEqual(200);
        expect(result.data.approval).toMatchObject({
          id: approval.id,
          status: "approved",
        });
        expect(result.data.approval.handled_by).toBeTruthy();
      });
    });

    // =========================================================================
    // AN02 — Idempotency: duplicate approval request
    // =========================================================================
    describe("Idempotency -- duplicate approval request", () => {
      it("AN02: second approval request is idempotent (200) or conflicts (400/409) with at most one record", async () => {
        const {
          data: { companies },
        } = await api.post(
          "/store/companies",
          { name: "Idem Co", email: "id@test.com", currency_code: "usd" },
          storeHeaders
        );
        const company = companies[0];

        await api.post(
          `/store/companies/${company.id}/employees`,
          { customer_id: customer.id, is_admin: true },
          storeHeaders
        );
        await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: true },
          storeHeaders
        );

        const cart = await cartSeeder({
          api,
          storeHeaders,
          data: {
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            items: [{ quantity: 1, variant_id: product.variants[0].id }],
            metadata: { company_id: company.id },
          },
        });

        // First request — must succeed
        const first = await api.post(
          `/store/carts/${cart.id}/approvals`,
          {},
          storeHeaders
        );
        expect(first.status).toEqual(200);

        // Second request — idempotent 200 or conflict 400/409
        const second = await api
          .post(`/store/carts/${cart.id}/approvals`, {}, storeHeaders)
          .catch((e: any) => e);

        const secondStatus =
          second?.response?.status ?? second?.status;
        expect([200, 400, 409]).toContain(secondStatus);

        // At most one pending approval record for the cart
        const { data: listData } = await api.get("/store/approvals", storeHeaders);
        const cartsForThisCart = (listData.carts_with_approvals || []).filter(
          (c: any) => c.id === cart.id
        );
        const approvalCount = cartsForThisCart.reduce(
          (sum: number, c: any) => sum + (c.approvals?.length ?? 0),
          0
        );
        expect(approvalCount).toBeLessThanOrEqual(1);
      });
    });
  },
});
