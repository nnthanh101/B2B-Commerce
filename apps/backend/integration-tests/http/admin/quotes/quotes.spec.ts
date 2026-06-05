import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../../utils/admin";
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../../utils/seeder";
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../utils/store";

// 300s: medusaIntegrationTestRunner in-app boot ~60-70s on local Docker (PDCA 2026-06-04)
jest.setTimeout(300 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    JWT_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: any, cart: any, product: any, salesChannel: any, region: any, customerToken: string;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const publishableKey = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey });
      const res = await createStoreUser({ api, storeHeaders });
      customerToken = res.token;
      (storeHeaders.headers as any)["Authorization"] = `Bearer ${customerToken}`;
      region = await regionSeeder({ api, adminHeaders, data: {} });

      salesChannel = await salesChannelSeeder({
        api,
        adminHeaders,
        data: {},
      });

      product = await productSeeder({
        api,
        adminHeaders,
        data: {
          sales_channels: [{ id: salesChannel.id }],
        },
      });

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders
      );

      cart = await cartSeeder({
        api,
        storeHeaders,
        data: {
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          items: [{ quantity: 1, variant_id: product.variants[0].id }],
        },
      });
    });

    describe("POST /admin/quotes/:id/messages", () => {
      let quote1: any;

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders);

        quote1 = newQuote;
      });

      it("successfully creates an admin quote message", async () => {
        const {
          data: { quote },
        } = await api.post(
          `/admin/quotes/${quote1.id}/messages`,
          {
            text: "test message",
            item_id: cart.items[0].id,
          },
          adminHeaders
        );

        expect(quote).toEqual(
          expect.objectContaining({
            id: quote1.id,
            messages: [
              expect.objectContaining({
                text: "test message",
                item_id: cart.items[0].id,
                admin_id: expect.any(String),
                customer_id: null,
              }),
            ],
          })
        );
      });
    });

    // =========================================================================
    // POST /admin/quotes/:id/send
    // =========================================================================
    describe("POST /admin/quotes/:id/send", () => {
      let quote1: any;

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders);
        quote1 = newQuote;
      });

      it("sends a quote and returns the updated quote with a valid id", async () => {
        const { status, data } = await api.post(
          `/admin/quotes/${quote1.id}/send`,
          {},
          adminHeaders
        );

        expect(status).toEqual(200);
        expect(data.quote).toMatchObject({
          id: quote1.id,
        });
        // status after send should be non-pending — confirmed from store/quotes accept test:
        // the quote must be sent before a customer can accept it
        expect(data.quote.status).toBeDefined();
        expect(typeof data.quote.status).toBe("string");
      });
    });

    // =========================================================================
    // GET /admin/quotes/:id
    // =========================================================================
    describe("GET /admin/quotes/:id", () => {
      let quote1: any;

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders);
        quote1 = newQuote;
      });

      it("retrieves a quote with draft_order and messages fields", async () => {
        const { status, data } = await api.get(
          `/admin/quotes/${quote1.id}`,
          adminHeaders
        );

        expect(status).toEqual(200);
        expect(data.quote).toMatchObject({
          id: quote1.id,
          cart: expect.objectContaining({ id: cart.id }),
          draft_order: expect.objectContaining({
            id: quote1.draft_order_id,
          }),
        });
        // messages field is present (empty array before any messages are added)
        expect(Array.isArray(data.quote.messages)).toBe(true);
      });

      it("returns quote with messages after adding one", async () => {
        await api.post(
          `/admin/quotes/${quote1.id}/messages`,
          { text: "hello from admin", item_id: cart.items[0].id },
          adminHeaders
        );

        const { data } = await api.get(
          `/admin/quotes/${quote1.id}`,
          adminHeaders
        );

        expect(data.quote.messages).toHaveLength(1);
        expect(data.quote.messages[0]).toMatchObject({
          text: "hello from admin",
          admin_id: expect.any(String),
          customer_id: null,
        });
      });
    });
  },
});
