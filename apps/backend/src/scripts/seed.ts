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
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import { createUserAccountWorkflow } from "@medusajs/core-flows"
import {
  SUPPORTED_MARKETS,
  DEFAULT_MARKET,
  pricesFor,
} from "../config/supported-markets"

// SEED_IMAGE_BASE_URL controls where product images are fetched from at seed time.
// Default: local B2B-Commerce /static directory (offline-safe, no S3 dependency).
// Override: set SEED_IMAGE_BASE_URL=https://medusa-public-images.s3.eu-west-1.amazonaws.com
//   in your .env to seed from the reference bucket (reference fallback only — never hardcoded).
// Forward pattern: all future products/categories read their image base from this const.
const IMG =
  process.env.SEED_IMAGE_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:9000/static"
const WAREHOUSE_COUNTRY = process.env.WAREHOUSE_COUNTRY || "NZ"

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
            supported_currencies: SUPPORTED_MARKETS.map((m) => ({
              currency_code: m.currency,
              is_default: m.iso2 === DEFAULT_MARKET,
            })),
            default_sales_channel_id: defaultSalesChannel.id,
          },
        ],
      },
    })
  } else {
    logger.info("Store already exists, skipping creation.")
  }

  // ── Regions — one per market (SSOT: SUPPORTED_MARKETS) ───────────────────────
  logger.info("Seeding region data...")
  const regionModule = container.resolve(Modules.REGION)

  // Migration guard: delete legacy "Oceania" and "Europe" regions (from the
  // old 2-region model) if present so their country assignments do not block
  // creating the new per-market regions below.
  for (const legacyName of ["Oceania", "Europe"]) {
    const legacyRegions = await regionModule.listRegions({ name: legacyName })
    if (legacyRegions.length > 0) {
      await regionModule.deleteRegions(legacyRegions.map((r: any) => r.id))
      logger.info(`Removed legacy region "${legacyName}" (migrating to per-market model).`)
    }
  }

  // Primary (NZD) region is used later for shipping prices and the demo-b2b cart.
  let defaultRegion: any

  const taxModule = container.resolve(Modules.TAX)

  for (const market of SUPPORTED_MARKETS) {
    const existing = await regionModule.listRegions({ name: market.name })
    if (existing.length > 0) {
      logger.info(`${market.name} region already exists, skipping creation.`)
      if (market.iso2 === DEFAULT_MARKET) {
        defaultRegion = existing[0]
      }
    } else {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: market.name,
              currency_code: market.currency,
              countries: [market.iso2],
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })
      logger.info(`${market.name} (${market.currency.toUpperCase()}) region created.`)
      if (market.iso2 === DEFAULT_MARKET) {
        defaultRegion = result[0]
      }
    }

    // Tax region — idempotent: only create if absent (tax regions persist when
    // their region is deleted, so we must check independently of region existence).
    const existingTaxRegions = await taxModule.listTaxRegions({
      country_code: market.iso2,
    })
    if (existingTaxRegions.length > 0) {
      logger.info(`Tax region for ${market.iso2} already exists, skipping.`)
    } else {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: market.iso2, provider_id: "tp_system" }],
      })
      logger.info(`Tax region seeded for ${market.iso2}.`)
    }
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
                country_code: WAREHOUSE_COUNTRY,
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
            name: "Global",
            geo_zones: SUPPORTED_MARKETS.map((m) => ({
              country_code: m.iso2,
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

    // Shipping prices: one per supported currency (via SSOT pricesFor)
    // Standard shipping base = $10 USD; Express base = $18 USD.
    const standardShippingPrices = pricesFor(10)
    const expressShippingPrices = pricesFor(18)

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
          prices: standardShippingPrices,
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
          prices: expressShippingPrices,
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
                prices: pricesFor(1299),
              },
              {
                title: "512 GB / Red",
                sku: "512-RED",
                options: { Storage: "512 GB", Color: "Red" },
                manage_inventory: false,
                prices: pricesFor(1259),
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
                prices: pricesFor(59),
              },
              {
                title: "Webcam White",
                sku: "WEBCAM-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: pricesFor(65),
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
                prices: pricesFor(999),
              },
              {
                title: "256 GB Red",
                sku: "PHONE-256-RED",
                options: { Memory: "256 GB", Color: "Red" },
                manage_inventory: false,
                prices: pricesFor(959),
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
                prices: pricesFor(599),
              },
              {
                title: "Monitor Black",
                sku: "ACME-MONITOR-BLACK",
                options: { Color: "Black" },
                manage_inventory: false,
                prices: pricesFor(599),
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
                prices: pricesFor(149),
              },
              {
                title: "Headphone White",
                sku: "HEADPHONE-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: pricesFor(149),
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
                prices: pricesFor(99),
              },
              {
                title: "Keyboard White",
                sku: "KEYBOARD-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: pricesFor(99),
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
                prices: pricesFor(79),
              },
              {
                title: "Mouse White",
                sku: "MOUSE-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: pricesFor(79),
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
                prices: pricesFor(79),
              },
              {
                title: "Speaker White",
                sku: "SPEAKER-WHITE",
                options: { Color: "White" },
                manage_inventory: false,
                prices: pricesFor(55),
              },
            ],
            sales_channels: sc,
          },
        ],
      },
    })
    logger.info("Finished seeding product data.")
  } else {
    // ── Price refresh guard ───────────────────────────────────────────────────
    // Products were created before the 6-market model; their variants may carry
    // a stale currency set (e.g. eur + nzd + usd only). Walk every variant and
    // replace its prices with the full SSOT 6-currency set derived from the
    // existing USD price.
    //
    // upsertVariantPricesWorkflow semantics:
    //   - variant_id in previousVariantIds → UPDATE existing price set
    //   - variant_id NOT in previousVariantIds → CREATE new price set
    // Since these variants already have price sets, pass all their IDs as
    // previousVariantIds so the workflow updates rather than creates.
    //
    // Running this guard on an already-correct seed is safe:
    // a second run detects 0 stale/missing currencies and skips those variants.
    logger.info("Products exist — running price refresh guard for all 6 SSOT currencies...")

    const EXPECTED_CURRENCIES: Set<string> = new Set(
      SUPPORTED_MARKETS.map((m) => m.currency)
    )

    // Use the query service to fetch variant prices via the remote link
    // (variant → price_set → prices). This is the canonical Medusa 2.x approach.
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const allProducts = await productModule.listProducts(
      {},
      { relations: ["variants"] }
    )

    for (const product of allProducts) {
      const variants: any[] = (product as any).variants ?? []
      if (variants.length === 0) continue

      const variantIds = variants.map((v: any) => v.id as string)

      // Fetch variant → price data via the graph query
      const { data: variantData } = await query.graph({
        entity: "product_variant",
        fields: ["id", "sku", "prices.*"],
        filters: { id: variantIds },
      })

      // Build a map: variant_id → { baseUsd, currencies }
      const variantPriceMap: Record<string, { baseUsd: number | null; currencies: Set<string> }> = {}
      for (const v of variantData as any[]) {
        const prices: any[] = v.prices ?? []
        const usdPrice = prices.find((p: any) => p.currency_code === "usd")
        variantPriceMap[v.id] = {
          baseUsd: usdPrice ? usdPrice.amount : null,
          currencies: new Set(prices.map((p: any) => p.currency_code as string)),
        }
      }

      // Collect variants that need price refresh.
      const variantPrices: {
        variant_id: string
        product_id: string
        prices: { currency_code: string; amount: number }[]
      }[] = []
      const staleVariantIds: string[] = []

      for (const variant of variants) {
        const info = variantPriceMap[variant.id]
        if (!info || info.baseUsd === null) {
          logger.warn(`Variant ${variant.id} (${variant.sku ?? "?"}) has no USD price — skipping.`)
          continue
        }

        const missingCurrencies = [...EXPECTED_CURRENCIES].filter(
          (c) => !info.currencies.has(c)
        )
        const staleCurrencies = [...info.currencies].filter(
          (c) => !EXPECTED_CURRENCIES.has(c)
        )

        if (missingCurrencies.length === 0 && staleCurrencies.length === 0) {
          continue
        }

        logger.info(
          `Variant ${variant.id} (${variant.sku ?? "?"}): ` +
          `missing=[${missingCurrencies.join(",")}] stale=[${staleCurrencies.join(",")}] → refreshing`
        )

        variantPrices.push({
          variant_id: variant.id,
          product_id: product.id,
          prices: pricesFor(info.baseUsd),
        })
        // Mark as existing so upsertVariantPricesWorkflow updates the price set.
        staleVariantIds.push(variant.id)
      }

      if (variantPrices.length > 0) {
        await upsertVariantPricesWorkflow(container).run({
          input: {
            variantPrices,
            // Pass as previousVariantIds so the workflow UPDATES existing price sets
            // instead of creating new ones.
            previousVariantIds: staleVariantIds,
          },
        })
        logger.info(
          `Price refresh complete for "${product.title}" — ` +
          `${variantPrices.length} variant(s) updated to SSOT 6-currency set.`
        )
      }
    }

    logger.info("Price refresh guard complete.")
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
        // Medusa v2: admin actor scope is "user" (was the non-existent `authScope`).
        actor_type: "user",
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
