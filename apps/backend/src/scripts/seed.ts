/**
 * SAMPLE / TEST BASE-SEED DATA — NOT REAL OCEANSOFT.IO PRODUCTION CONTENT
 * -------------------------------------------------------------------------
 * This electronics catalog (laptop, phone, camera, monitor, headset, keyboard,
 * mouse, speaker) is borrowed from the Medusa starter and is used ONLY to give
 * the store a working catalog so E2E tests render correctly.
 *
 * Do NOT treat these products as OceanSoft offerings.
 *
 * This is NOT the real oceansoft.io product catalog.
 * The real oceansoft.io B2B digital-products catalog is DEFERRED to a later
 * PO+CA stage — HITL will provide the product list (names, types, prices,
 * imagery) at that time.
 *
 * Images are served locally via SEED_IMAGE_BASE_URL
 * (default: http://localhost:9000/static), zero remote dependency.
 *
 * HITL directive: 2026-06-05
 */
import fs from "node:fs"
import path from "node:path"
import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

// SEED_IMAGE_BASE_URL controls where product images are fetched from at seed time.
// Default: local B2B-Commerce /static directory (offline-safe, no S3 dependency).
// Override: set SEED_IMAGE_BASE_URL=https://medusa-public-images.s3.eu-west-1.amazonaws.com
//   in your .env to seed from the reference bucket (reference fallback only — never hardcoded).
// Forward pattern: all future products/categories read their image base from this const.
const IMG =
  process.env.SEED_IMAGE_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:9000/static"

export default async function seed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  // Oceania (primary demo region: NZ/NZD) — NZ lives in a separate NZD region
  // so it is deliberately excluded from the "Europe" country list below.
  const nzCountries = ["nz"]
  const euCountries = ["gb", "de", "se", "fr", "es", "it"]
  const countries = [...nzCountries, ...euCountries]

  // ── Sales channel ────────────────────────────────────────────────────────────
  logger.info("Seeding store data...")

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const existingChannels = await salesChannelModule.listSalesChannels({
    name: "Default Sales Channel",
  })

  let defaultSalesChannel: any
  if (existingChannels.length > 0) {
    logger.info("Default Sales Channel already exists, skipping creation.")
    defaultSalesChannel = existingChannels[0]
  } else {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
            description: "Created by B2B-Commerce",
          },
        ],
      },
    })
    defaultSalesChannel = result[0]
  }

  // ── Publishable API key ───────────────────────────────────────────────────────
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const existingKeys = await apiKeyModule.listApiKeys({ type: "publishable" })

  let publishableApiKey: any
  if (existingKeys.length > 0) {
    logger.info("Publishable API key already exists, skipping creation.")
    publishableApiKey = existingKeys[0]
  } else {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Default Publishable API Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    publishableApiKey = result[0]

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel.id],
      },
    })
  }

  // ── Store ─────────────────────────────────────────────────────────────────────
  const storeModule = container.resolve(Modules.STORE)
  const existingStores = await storeModule.listStores()

  if (existingStores.length === 0) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "Default Store",
            supported_currencies: [
              {
                currency_code: "nzd",
                is_default: true,
              },
              {
                currency_code: "eur",
                is_default: false,
              },
              {
                currency_code: "usd",
                is_default: false,
              },
            ],
            default_sales_channel_id: defaultSalesChannel.id,
          },
        ],
      },
    })
  } else {
    logger.info("Store already exists, skipping creation.")
  }

  // ── Regions ───────────────────────────────────────────────────────────────────
  logger.info("Seeding region data...")
  const regionModule = container.resolve(Modules.REGION)

  // Primary demo region: Oceania (NZD) — OceanSoft HQ is Auckland, NZ.
  const existingOceaniaRegions = await regionModule.listRegions({ name: "Oceania" })
  let region: any
  if (existingOceaniaRegions.length > 0) {
    logger.info("Oceania region already exists, skipping creation.")
    region = existingOceaniaRegions[0]
  } else {
    const { result: oceaniaResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Oceania",
            currency_code: "nzd",
            countries: nzCountries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = oceaniaResult[0]
    logger.info("Oceania (NZD) region created.")

    logger.info("Seeding NZ tax region...")
    await createTaxRegionsWorkflow(container).run({
      input: nzCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    })
  }

  // Secondary region: Europe (EUR)
  const existingEuropeRegions = await regionModule.listRegions({ name: "Europe" })
  if (existingEuropeRegions.length === 0) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Europe",
            currency_code: "eur",
            countries: euCountries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    logger.info("Europe (EUR) region created.")

    logger.info("Seeding EU tax regions...")
    await createTaxRegionsWorkflow(container).run({
      input: euCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    })
  } else {
    logger.info("Europe region already exists, skipping creation.")
  }
  logger.info("Finished seeding regions.")

  // ── Stock location ────────────────────────────────────────────────────────────
  logger.info("Seeding stock location data...")
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const existingLocations = await stockLocationModule.listStockLocations({
    name: "European Warehouse",
  })

  let stockLocation: any
  if (existingLocations.length > 0) {
    logger.info("Stock location already exists, skipping creation.")
    stockLocation = existingLocations[0]
  } else {
    const { result: stockLocationResult } =
      await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            {
              name: "European Warehouse",
              address: {
                city: "Auckland",
                country_code: "NZ",
                address_1: "",
              },
            },
          ],
        },
      })
    stockLocation = stockLocationResult[0]

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })

    // ── Fulfillment ─────────────────────────────────────────────────────────────
    logger.info("Seeding fulfillment data...")
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default",
              type: "default",
            },
          ],
        },
      })
    const shippingProfile = shippingProfileResult[0]

    const fulfillmentSet =
      await fulfillmentModuleService.createFulfillmentSets({
        name: "European Warehouse delivery",
        type: "shipping",
        service_zones: [
          {
            name: "Europe",
            geo_zones: countries.map((country_code) => ({
              country_code,
              type: "country" as const,
            })),
          },
        ],
      })

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })

    const shippingOptionPrices = [
      { currency_code: "nzd", amount: 15 },
      { currency_code: "usd", amount: 10 },
      { currency_code: "eur", amount: 10 },
      { region_id: region.id, amount: 15 },
    ]

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          prices: shippingOptionPrices,
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Ship in 24 hours.",
            code: "express",
          },
          prices: shippingOptionPrices,
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    logger.info("Finished seeding fulfillment data.")

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    })
    logger.info("Finished seeding stock location data.")
  }

  // ── Products ──────────────────────────────────────────────────────────────────
  logger.info("Seeding product data...")
  const productModule = container.resolve(Modules.PRODUCT)
  const existingProducts = await productModule.listProducts()

  if (existingProducts.length === 0) {
    const {
      result: [collection],
    } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [
          {
            title: "Featured",
            handle: "featured",
          },
        ],
      },
    })

    const { result: categoryResult } =
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [
            { name: "Laptops", is_active: true },
            { name: "Accessories", is_active: true },
            { name: "Phones", is_active: true },
            { name: "Monitors", is_active: true },
          ],
        },
      })

    const catId = (name: string) =>
      categoryResult.find((c) => c.name === name)?.id!

    const sc = [{ id: defaultSalesChannel.id }]

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title:
              '16" Ultra-Slim AI Laptop | 3K OLED | 1.1cm Thin | 6-Speaker Audio',
            collection_id: collection.id,
            category_ids: [catId("Laptops")],
            description:
              "Ultra-thin 16-inch AI-enhanced laptop with 3K OLED display and six-speaker audio.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/laptop.png`,
              },
            ],
            options: [
              { title: "Storage", values: ["256 GB", "512 GB"] },
              { title: "Color", values: ["Blue", "Red"] },
            ],
            variants: [
              {
                title: "256 GB / Blue",
                sku: "256-BLUE",
                options: { Storage: "256 GB", Color: "Blue" },
                manage_inventory: false,
                prices: [
                  { amount: 1999, currency_code: "nzd" },
                  { amount: 1299, currency_code: "eur" },
                  { amount: 1299, currency_code: "usd" },
                ],
              },
              {
                title: "512 GB / Red",
                sku: "512-RED",
                options: { Storage: "512 GB", Color: "Red" },
                manage_inventory: false,
                prices: [
                  { amount: 1949, currency_code: "nzd" },
                  { amount: 1259, currency_code: "eur" },
                  { amount: 1259, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: "1080p HD Pro Webcam | Superior Video | Privacy enabled",
            category_ids: [catId("Accessories")],
            description: "High-quality 1080p webcam for superior video collaboration.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/camera.png`,
              },
            ],
            options: [{ title: "Color", values: ["Black", "White"] }],
            variants: [
              {
                title: "Webcam Black",
                sku: "WEBCAM-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 99, currency_code: "nzd" },
                  { amount: 59, currency_code: "eur" },
                  { amount: 59, currency_code: "usd" },
                ],
              },
              {
                title: "Webcam White",
                sku: "WEBCAM-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 109, currency_code: "nzd" },
                  { amount: 65, currency_code: "eur" },
                  { amount: 65, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: `6.5" Ultra HD Smartphone | 3x Impact-Resistant Screen`,
            collection_id: collection.id,
            category_ids: [catId("Phones")],
            description:
              "Premium 6.5-inch AMOLED smartphone with aerospace-grade aluminum chassis.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/phone.png`,
              },
            ],
            options: [
              { title: "Memory", values: ["256 GB", "512 GB"] },
              { title: "Color", values: ["Purple", "Red"] },
            ],
            variants: [
              {
                title: "256 GB Purple",
                sku: "PHONE-256-PURPLE",
                options: { Memory: "256 GB", Color: "Purple" },
                manage_inventory: false,
                prices: [
                  { amount: 1599, currency_code: "nzd" },
                  { amount: 999, currency_code: "eur" },
                  { amount: 999, currency_code: "usd" },
                ],
              },
              {
                title: "256 GB Red",
                sku: "PHONE-256-RED",
                options: { Memory: "256 GB", Color: "Red" },
                manage_inventory: false,
                prices: [
                  { amount: 1549, currency_code: "nzd" },
                  { amount: 959, currency_code: "eur" },
                  { amount: 959, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: `34" QD-OLED Curved Gaming Monitor | Ultra-Wide | Infinite Contrast | 175Hz`,
            collection_id: collection.id,
            category_ids: [catId("Monitors")],
            description:
              "34-inch curved QD-OLED monitor with quantum dot technology and 175Hz refresh.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/screen.png`,
              },
            ],
            options: [{ title: "Color", values: ["White", "Black"] }],
            variants: [
              {
                title: "Monitor White",
                sku: "ACME-MONITOR-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 999, currency_code: "nzd" },
                  { amount: 599, currency_code: "eur" },
                  { amount: 599, currency_code: "usd" },
                ],
              },
              {
                title: "Monitor Black",
                sku: "ACME-MONITOR-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 999, currency_code: "nzd" },
                  { amount: 599, currency_code: "eur" },
                  { amount: 599, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: "Hi-Fi Gaming Headset | Pro-Grade DAC | Hi-Res Certified",
            collection_id: collection.id,
            category_ids: [catId("Accessories")],
            description:
              "Advanced acoustic system with integrated DAC for professional-grade audio.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/headphone.png`,
              },
            ],
            options: [{ title: "Color", values: ["Black", "White"] }],
            variants: [
              {
                title: "Headphone Black",
                sku: "HEADPHONE-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 249, currency_code: "nzd" },
                  { amount: 149, currency_code: "eur" },
                  { amount: 149, currency_code: "usd" },
                ],
              },
              {
                title: "Headphone White",
                sku: "HEADPHONE-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 249, currency_code: "nzd" },
                  { amount: 149, currency_code: "eur" },
                  { amount: 149, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: "Wireless Keyboard | Touch ID | Numeric Keypad",
            category_ids: [catId("Accessories")],
            description:
              "Wireless keyboard with Touch ID, numeric keypad and rechargeable battery.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/keyboard.png`,
              },
            ],
            options: [{ title: "Color", values: ["Black", "White"] }],
            variants: [
              {
                title: "Keyboard Black",
                sku: "KEYBOARD-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 159, currency_code: "nzd" },
                  { amount: 99, currency_code: "eur" },
                  { amount: 99, currency_code: "usd" },
                ],
              },
              {
                title: "Keyboard White",
                sku: "KEYBOARD-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 159, currency_code: "nzd" },
                  { amount: 99, currency_code: "eur" },
                  { amount: 99, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: "Wireless Rechargeable Mouse | Multi-Touch Surface",
            category_ids: [catId("Accessories")],
            description:
              "Wireless rechargeable mouse with multi-touch surface and month-long battery.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/mouse.png`,
              },
            ],
            options: [{ title: "Color", values: ["Black", "White"] }],
            variants: [
              {
                title: "Mouse Black",
                sku: "MOUSE-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 129, currency_code: "nzd" },
                  { amount: 79, currency_code: "eur" },
                  { amount: 79, currency_code: "usd" },
                ],
              },
              {
                title: "Mouse White",
                sku: "MOUSE-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 129, currency_code: "nzd" },
                  { amount: 79, currency_code: "eur" },
                  { amount: 79, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
          {
            title: "Conference Speaker | High-Performance | Budget-Friendly",
            category_ids: [catId("Accessories")],
            description:
              "Compact conference speaker with advanced productivity-enhancing technology.",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            images: [
              {
                url: `${IMG}/speaker.png`,
              },
            ],
            options: [{ title: "Color", values: ["Black", "White"] }],
            variants: [
              {
                title: "Speaker Black",
                sku: "SPEAKER-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: [
                  { amount: 129, currency_code: "nzd" },
                  { amount: 79, currency_code: "eur" },
                  { amount: 79, currency_code: "usd" },
                ],
              },
              {
                title: "Speaker White",
                sku: "SPEAKER-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: [
                  { amount: 89, currency_code: "nzd" },
                  { amount: 55, currency_code: "eur" },
                  { amount: 55, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: sc,
          },
        ],
      },
    })
    logger.info("Finished seeding product data.")
  } else {
    logger.info("Products already exist, skipping creation.")
  }

  // ── D6: Write publishable key into storefront env ─────────────────────────────
  logger.info("D6: Syncing publishable API key into storefront env...")
  const pubKeys = await apiKeyModule.listApiKeys({ type: "publishable" })
  if (pubKeys.length > 0) {
    const token = pubKeys[0].token
    const envPath = path.resolve("/server/apps/storefront/.env")
    const envKey = "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
    const newLine = `${envKey}=${token}`

    let content = ""
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf8")
    }

    const lines = content.split("\n")
    const idx = lines.findIndex((l) => l.startsWith(`${envKey}=`))
    if (idx >= 0) {
      lines[idx] = newLine
      content = lines.join("\n")
    } else {
      content = content.length > 0 ? `${content}\n${newLine}\n` : `${newLine}\n`
    }

    fs.mkdirSync(path.dirname(envPath), { recursive: true })
    fs.writeFileSync(envPath, content, "utf8")
    logger.info(`D6: ${envKey}=pk_***${token.slice(-6)} written to ${envPath}`)
  } else {
    logger.warn("D6: No publishable API key found — storefront env not updated.")
  }

  // ── D7: Bootstrap admin user (idempotent) ─────────────────────────────────────
  logger.info("D7: Checking for admin user...")
  const userModule = container.resolve(Modules.USER)
  const existingUsers = await userModule.listUsers()

  if (existingUsers.length > 0) {
    logger.info(
      `D7: Admin user already exists (${existingUsers[0].email}), skipping creation.`
    )
  } else {
    const adminEmail =
      process.env.ADMIN_EMAIL ?? "admin@test.local"
    const adminPassword =
      process.env.ADMIN_PASSWORD ?? "Test1234!"

    const authModule = container.resolve(Modules.AUTH)
    const { success, authIdentity, error } = await authModule.register(
      "emailpass",
      {
        url: "",
        headers: {},
        query: {},
        body: { email: adminEmail, password: adminPassword },
        authScope: "admin",
      }
    )

    if (!success || !authIdentity) {
      logger.error(
        `D7: Failed to register admin auth identity — ${error ?? "unknown error"}`
      )
    } else {
      await createUserAccountWorkflow(container).run({
        input: {
          authIdentityId: authIdentity.id,
          userData: { email: adminEmail },
        },
      })
      logger.info(`D7: Admin user created — ${adminEmail}`)
    }
  }

  logger.info("Seed complete.")
}
