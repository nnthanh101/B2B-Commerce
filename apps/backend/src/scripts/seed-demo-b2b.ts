/**
 * Demo B2B Seed Script — `medusa exec` path
 * ─────────────────────────────────────────
 * Scope: b2b-commerce-demo-3act-storyboard
 *
 * Purpose:
 *   Idempotently populate company + buyer employee + approval-settings
 *   (requires_admin_approval=true) + a pending approval row + a quote row
 *   so that admin /app/approvals and /app/quotes show REAL data on any clone.
 *
 * Entity chain (approval side):
 *   Company → approval_settings (requires_admin_approval=true)
 *   ↓
 *   Customer → Employee (linked to Company)
 *   ↓
 *   Cart (linked to Company via company_company_cart_cart)
 *   ↓
 *   Approval + ApprovalStatus (linked to Cart via cart_cart_approval_approval
 *   and cart_cart_approval_approval_status)
 *
 * Entity chain (quote side):
 *   Customer → Draft Order → OrderChange → Quote
 *
 * Run (inside container):
 *   npx medusa exec ./src/scripts/seed-demo-b2b.ts
 *
 * Run (via docker exec from host):
 *   docker exec ec_backend npx medusa exec ./src/scripts/seed-demo-b2b.ts
 *
 * Idempotent: checks-then-creates at every step.
 * No HTTP calls. Uses module services + workflows directly (same pattern as seed.ts).
 */

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { SUPPORTED_MARKETS } from "../config/supported-markets"
import {
  createOrdersWorkflow,
  createOrderWorkflow,
  completeOrderWorkflow,
  beginOrderEditOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import { OrderStatus } from "@medusajs/framework/utils"
import { APPROVAL_MODULE } from "../modules/approval"
import { COMPANY_MODULE } from "../modules/company"
import { QUOTE_MODULE } from "../modules/quote"
import {
  ApprovalStatusType,
  ApprovalType,
  IApprovalModuleService,
  ICompanyModuleService,
  IQuoteModuleService,
  ModuleCompanySpendingLimitResetFrequency,
} from "../types"
import { createCompaniesWorkflow } from "../workflows/company/workflows"
import { createEmployeesWorkflow } from "../workflows/employee/workflows"
import { createApprovalsWorkflow } from "../workflows/approval/workflows"

// ─── Constants ───────────────────────────────────────────────────────────────

const DEMO_COMPANY_NAME = "Demo Corp"
const DEMO_COMPANY_EMAIL = "contact@democorp.local"
const DEMO_BUYER_EMAIL = "demo-buyer@democorp.local"
const DEMO_BUYER_PASSWORD = "Test1234!"
const DEMO_COUNTRY = process.env.DEMO_COMPANY_COUNTRY || "nz"
const DEMO_CURRENCY = process.env.DEMO_COMPANY_CURRENCY || "nzd"
// DFA-02: Employee spending limit — admin displays value 1:1 (no /100); 200 shows as NZ$200.
// cart.total for 2 items at NZ$130 each = 260 (major units), so 260 > 200 → banner fires.
// *orders expansion does NOT include order.total (undefined), so spent = 0 always.
const DEMO_EMPLOYEE_SPENDING_LIMIT = parseInt(
  process.env.DEMO_EMPLOYEE_SPENDING_LIMIT || "200",
  10
)
// DFA-05: Company spending limit narrated as NZ$2,000 = 200000 minor units.
const DEMO_COMPANY_SPENDING_LIMIT = parseInt(
  process.env.DEMO_COMPANY_SPENDING_LIMIT || "200000",
  10
)

// Validate DEMO_COUNTRY is a known market iso2 — fail fast with a clear message.
const validIso2s = SUPPORTED_MARKETS.map((m) => m.iso2) as readonly string[]
if (!validIso2s.includes(DEMO_COUNTRY)) {
  throw new Error(
    `DEMO_COMPANY_COUNTRY="${DEMO_COUNTRY}" is not a supported market. ` +
    `Valid values: ${validIso2s.join(", ")}`
  )
}

// Derive the region name and currency from SUPPORTED_MARKETS so the region
// lookup below matches the name created by seed.ts.
const demoMarket = SUPPORTED_MARKETS.find((m) => m.iso2 === DEMO_COUNTRY)!

// ─── Main ────────────────────────────────────────────────────────────────────

export default async function seedDemoB2B({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const approvalModule =
    container.resolve<IApprovalModuleService>(APPROVAL_MODULE)
  const companyModule =
    container.resolve<ICompanyModuleService>(COMPANY_MODULE)
  const quoteModule = container.resolve<IQuoteModuleService>(QUOTE_MODULE)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const cartModule = container.resolve(Modules.CART)
  const authModule = container.resolve(Modules.AUTH)

  logger.info("=== Demo B2B Seed ===")

  // ── Step 1: Company (idempotent) ─────────────────────────────────────────

  logger.info("Step 1: Company...")

  const existingCompanies = await companyModule.listCompanies({
    name: DEMO_COMPANY_NAME,
  })

  let company: any
  if (existingCompanies.length > 0) {
    company = existingCompanies[0]
    logger.info(`  Company already exists (${company.id}) — skipping creation`)
    // DFA-05 durability guard: if the existing company has a stale currency_code
    // (e.g. EUR from a pre-NZD seed), correct it in-place so future reseeds
    // self-heal without requiring a db:reset.
    if (company.currency_code !== DEMO_CURRENCY) {
      const prevCurrency = company.currency_code
      await companyModule.updateCompanies({
        id: company.id,
        currency_code: DEMO_CURRENCY,
      } as any)
      company.currency_code = DEMO_CURRENCY
      logger.info(
        `  Company currency corrected to ${DEMO_CURRENCY} (was: ${prevCurrency})`
      )
    }
  } else {
    const { result: companies } = await createCompaniesWorkflow(container).run({
      input: [
        {
          name: DEMO_COMPANY_NAME,
          email: DEMO_COMPANY_EMAIL,
          phone: "+64 9 486 0000",
          address: "1 Demo Street",
          city: "Auckland",
          state: "Auckland",
          zip: "0622",
          country: DEMO_COUNTRY,
          logo_url: null,
          currency_code: DEMO_CURRENCY,
          spending_limit_reset_frequency:
            ModuleCompanySpendingLimitResetFrequency.MONTHLY,
        },
      ],
    })
    company = companies[0]
    logger.info(`  Company created: ${company.id}`)
  }

  // ── Step 2: Enable approval_settings (requires_admin_approval=true) ──────

  logger.info("Step 2: Approval settings...")

  const existingSettings = await approvalModule.listApprovalSettings({
    company_id: company.id,
  })

  let approvalSettings: any
  if (existingSettings.length > 0) {
    approvalSettings = existingSettings[0]
    if (!approvalSettings.requires_admin_approval) {
      ;[approvalSettings] = await approvalModule.updateApprovalSettings([
        {
          id: approvalSettings.id,
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      ])
      logger.info(`  Approval settings updated to requires_admin_approval=true`)
    } else {
      logger.info(
        `  Approval settings already enabled (${approvalSettings.id}) — skipping`
      )
    }
  } else {
    // createCompaniesWorkflow already created settings — this path only fires
    // on old companies created without the workflow
    ;[approvalSettings] = await approvalModule.createApprovalSettings([
      {
        company_id: company.id,
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
    ])
    await link.create({
      [COMPANY_MODULE]: { company_id: company.id },
      [APPROVAL_MODULE]: { approval_settings_id: approvalSettings.id },
    })
    logger.info(`  Approval settings created: ${approvalSettings.id}`)
  }

  // ── Step 3: Buyer customer (idempotent) ──────────────────────────────────
  //
  // DUPLICATE-CUSTOMER GUARD: The E2E fixture's registration path can create a
  // second customer record for the same email when the auth identity's
  // app_metadata.customer_id points to a non-existent or different customer.
  // This leaves two customers: one with the employee link (created by this seed)
  // and one without (created by the fixture). We must always select the
  // employee-linked customer so the auth identity stays pointed at the right one.

  logger.info("Step 3: Buyer customer...")

  const existingCustomers = await customerModule.listCustomers({
    email: DEMO_BUYER_EMAIL,
  })

  let customer: any
  if (existingCustomers.length > 1) {
    // Multiple customers — find the one already linked to an employee (has
    // company_company_employee_employee link). We cannot query that link here
    // without query.graph, but we CAN identify the seed-created one by checking
    // which customer_id the current employee row references. Use query to check.
    const { data: employeesWithCustomer } = await query.graph({
      entity: "employee",
      fields: ["id", "customer.id"],
      filters: { company_id: company.id },
    }).catch(() => ({ data: [] }))

    const linkedCustomerIds = new Set(
      employeesWithCustomer
        .filter((e: any) => e.customer?.id)
        .map((e: any) => e.customer.id)
    )

    const employeeLinkedCustomer = existingCustomers.find(
      (c: any) => linkedCustomerIds.has(c.id)
    )

    if (employeeLinkedCustomer) {
      customer = employeeLinkedCustomer
      logger.info(
        `  Multiple customers found (${existingCustomers.length}); ` +
        `selected employee-linked customer (${customer.id})`
      )
    } else {
      customer = existingCustomers[0]
      logger.info(
        `  Multiple customers found (${existingCustomers.length}); ` +
        `no employee link yet — using first (${customer.id})`
      )
    }
  } else if (existingCustomers.length === 1) {
    customer = existingCustomers[0]
    logger.info(`  Customer already exists (${customer.id}) — skipping creation`)
  } else {
    customer = await customerModule.createCustomers({
      email: DEMO_BUYER_EMAIL,
      first_name: "Demo",
      last_name: "Buyer",
    })
    logger.info(`  Customer created: ${customer.id}`)
  }

  // ── Step 3b: Buyer auth identity (allows storefront login) ──────────────
  //
  // ALWAYS force the auth identity to point at the customer selected in Step 3.
  // The E2E fixture's registration flow may have overwritten app_metadata.customer_id
  // to a different (employee-less) customer — we must correct that here every run.

  logger.info("Step 3b: Buyer auth identity...")

  try {
    const existingIdentities = await (authModule as any).listProviderIdentities({
      entity_id: DEMO_BUYER_EMAIL,
      provider: "emailpass",
    })

    if (existingIdentities.length > 0) {
      const authIdentity = await (authModule as any).retrieveAuthIdentity(
        existingIdentities[0].auth_identity_id,
        { select: ["id", "app_metadata"] }
      )
      // Always update — the fixture may have pointed the identity at a wrong customer.
      if (authIdentity.app_metadata?.customer_id !== customer.id) {
        await (authModule as any).updateAuthIdentities({
          id: authIdentity.id,
          app_metadata: {
            ...(authIdentity.app_metadata || {}),
            customer_id: customer.id,
          },
        })
        logger.info(
          `  Auth identity corrected: app_metadata.customer_id = ${customer.id} ` +
          `(was: ${authIdentity.app_metadata?.customer_id ?? "null"})`
        )
      } else {
        logger.info(`  Auth identity already correct (customer_id = ${customer.id})`)
      }
    } else {
      // Register auth identity for emailpass (store scope)
      const { success, authIdentity, error } = await (authModule as any).register(
        "emailpass",
        {
          url: "",
          headers: {},
          query: {},
          body: { email: DEMO_BUYER_EMAIL, password: DEMO_BUYER_PASSWORD },
          authScope: "store",
        }
      )

      if (!success || !authIdentity) {
        logger.warn(`  Failed to create buyer auth identity: ${error ?? "unknown"}`)
      } else {
        // Link customer_id into app_metadata so /auth/customer/emailpass returns actor_id
        await (authModule as any).updateAuthIdentities({
          id: authIdentity.id,
          app_metadata: {
            ...(authIdentity.app_metadata || {}),
            customer_id: customer.id,
          },
        })
        logger.info(`  Buyer auth identity created: ${authIdentity.id}, customer_id linked`)
      }
    }
  } catch (err: any) {
    logger.warn(`  Could not create/update buyer auth identity: ${err.message}`)
  }

  // ── Step 4: Employee link (customer ↔ company) ───────────────────────────

  logger.info("Step 4: Employee link...")

  const existingEmployees = await companyModule.listEmployees({
    company_id: company.id,
  })

  let employee: any
  if (existingEmployees.length > 0) {
    employee = existingEmployees[0]
    logger.info(`  Employee already exists (${employee.id}) — skipping creation`)
    // DFA-02 durability guard: correct spending_limit if stale (e.g. 500000 from pre-DFA seed)
    if (employee.spending_limit !== DEMO_EMPLOYEE_SPENDING_LIMIT) {
      await (companyModule as any).updateEmployees({
        id: employee.id,
        spending_limit: DEMO_EMPLOYEE_SPENDING_LIMIT,
      })
      employee.spending_limit = DEMO_EMPLOYEE_SPENDING_LIMIT
      logger.info(
        `  Employee spending_limit corrected to ${DEMO_EMPLOYEE_SPENDING_LIMIT} (displays as NZ$${DEMO_EMPLOYEE_SPENDING_LIMIT.toLocaleString()})`
      )
    }
    // DFA-02b durability: ensure employee↔customer remote link exists.
    // createEmployeesWorkflow (new-employee path) creates the link automatically,
    // but existing employees skip that workflow — the link may be missing or stale.
    const { data: empWithCustomer } = await query.graph({
      entity: "employee",
      fields: ["id", "customer.*"],
      filters: { id: employee.id },
    })
    const linkedCustomerId = (empWithCustomer[0] as any)?.customer?.id
    if (linkedCustomerId !== customer.id) {
      if (linkedCustomerId) {
        await link.dismiss({
          [COMPANY_MODULE]: { employee_id: employee.id },
          [Modules.CUSTOMER]: { customer_id: linkedCustomerId },
        })
        logger.info(`  Stale employee↔customer link dismissed (was: ${linkedCustomerId})`)
      }
      await link.create({
        [COMPANY_MODULE]: { employee_id: employee.id },
        [Modules.CUSTOMER]: { customer_id: customer.id },
      })
      logger.info(`  Employee↔customer link created: ${employee.id} → ${customer.id}`)
    } else {
      logger.info(`  Employee↔customer link already correct`)
    }
  } else {
    const { result: emp } = await createEmployeesWorkflow(container).run({
      input: {
        // customer_id is NOT a column on Employee — it is stored as a remote link.
        // Pass only the ORM-mapped fields; customerId drives the link step below.
        // DFA-02: spending_limit is set below the seeded cart total (2x Mouse NZ$260 = NZ$520)
        // so the over-limit banner fires in summary.tsx on first cart view.
        employeeData: {
          company_id: company.id,
          spending_limit: DEMO_EMPLOYEE_SPENDING_LIMIT,
          is_admin: true,
        } as any,
        customerId: customer.id,
      },
    })
    employee = emp
    logger.info(`  Employee created: ${employee.id}`)
  }

  // ── Step 4b: Admin user as company admin (for approval workflows) ─────────

  logger.info("Step 4b: Admin user company link...")

  const userModule = container.resolve(Modules.USER)
  const adminUsers = await userModule.listUsers()
  const adminUser = adminUsers[0]

  if (!adminUser) {
    logger.warn(`  No admin user found — skipping admin employee creation`)
  } else {
    const adminCustomers = await customerModule.listCustomers({
      email: adminUser.email,
    })

    let adminCustomer: any
    if (adminCustomers.length > 0) {
      adminCustomer = adminCustomers[0]
      logger.info(`  Admin customer found: ${adminCustomer.id}`)
    } else {
      adminCustomer = await customerModule.createCustomers({
        email: adminUser.email,
        first_name: adminUser.first_name || "Admin",
        last_name: adminUser.last_name || "User",
      })
      logger.info(`  Admin customer created: ${adminCustomer.id}`)
    }

    // Link the admin's customer auth identity (emailpass, store scope) to the customer record.
    //
    // When admin@test.local logs in via POST /auth/customer/emailpass, Medusa returns a JWT
    // with actor_id="" because the auth identity's app_metadata.customer_id is not set.
    // The /store/invites middleware calls authenticate("customer",...) which rejects actor_id=""
    // with 401. Fix: update the auth identity so app_metadata.customer_id = adminCustomer.id.
    //
    // The auth identity shared between admin and customer scope for admin@test.local is the
    // same identity (authid_*). We update app_metadata to include customer_id so subsequent
    // /auth/customer/emailpass logins return a token with actor_id = adminCustomer.id.
    try {
      const providerIdentities = await (authModule as any).listProviderIdentities({
        entity_id: adminUser.email,
        provider: "emailpass",
      })

      for (const pi of providerIdentities) {
        const authIdentity = await (authModule as any).retrieveAuthIdentity(
          pi.auth_identity_id,
          { select: ["id", "app_metadata"] }
        )

        if (!authIdentity.app_metadata?.customer_id) {
          await (authModule as any).updateAuthIdentities({
            id: authIdentity.id,
            app_metadata: {
              ...(authIdentity.app_metadata || {}),
              customer_id: adminCustomer.id,
            },
          })
          logger.info(
            `  Auth identity ${authIdentity.id} updated: app_metadata.customer_id = ${adminCustomer.id}`
          )
        } else {
          logger.info(
            `  Auth identity ${authIdentity.id} already has customer_id — skipping`
          )
        }
      }
    } catch (err: any) {
      logger.warn(`  Could not update admin auth identity: ${err.message}`)
    }

    // Employee↔Customer is a remote link (not a column on the Employee model).
    // Query all employees for the company, then check which one is linked to adminCustomer.
    const { data: companyEmployees } = await query.graph({
      entity: "employee",
      fields: ["id", "customer.*"],
      filters: { company_id: company.id },
    })
    const adminEmployees = companyEmployees.filter(
      (e: any) => e.customer?.id === adminCustomer.id
    )

    if (adminEmployees.length > 0) {
      logger.info(`  Admin employee already exists (${adminEmployees[0].id})`)
    } else {
      const { result: adminEmp } = await createEmployeesWorkflow(container).run({
        input: {
          // customer_id is NOT a column on Employee — stored as a remote link only.
          // DFA-05: admin employee spending_limit = company governance ceiling (NZ$2,000).
          employeeData: {
            company_id: company.id,
            spending_limit: DEMO_COMPANY_SPENDING_LIMIT,
            is_admin: true,
          } as any,
          customerId: adminCustomer.id,
        },
      })
      logger.info(`  Admin employee created: ${adminEmp.id}`)
    }
  }

  // ── Step 5: Cart linked to company (under Oceania/NZD region) ─────────────

  logger.info("Step 5: Cart linked to company (Oceania/NZD)...")

  // Look up a region and sales channel to create a valid cart
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions()

  // Find the region for the demo market by the exact name created by seed.ts
  // (e.g. "New Zealand" for iso2="nz"). Falls back to country-filter then first region.
  const marketRegions = await regionModule.listRegions({ name: demoMarket.name })
  let region = marketRegions.length > 0 ? marketRegions[0] : null

  if (!region) {
    // Secondary fallback: country relationship check (may work if populated)
    region = regions.find((r: any) =>
      r.countries?.some((c: any) => c.iso_2 === DEMO_COUNTRY)
    ) ?? null
  }

  if (!region) {
    logger.warn(
      `WARNING: No ${demoMarket.name} (${DEMO_COUNTRY}) region found. Using first region. ` +
      `Demo quotes/orders may NOT be in ${DEMO_CURRENCY.toUpperCase()}.`
    )
    region = regions[0]
  }

  if (!region) {
    throw new Error(
      "No region found — run the base seed.ts first (npx medusa exec ./src/scripts/seed.ts)"
    )
  }

  logger.info(
    `  Using region: ${region.id} ` +
    `(currency=${region.currency_code}, countries=${region.countries?.map((c: any) => c.iso_2).join(",")})`
  )

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const salesChannels = await salesChannelModule.listSalesChannels()
  const salesChannel = salesChannels[0]

  // Check if this company already has a cart linked (via link table)
  const { data: companyWithCarts } = await query.graph({
    entity: "company",
    fields: ["id", "carts.*"],
    filters: { id: company.id },
  })

  let cart: any
  if (
    companyWithCarts.length > 0 &&
    companyWithCarts[0].carts &&
    companyWithCarts[0].carts.length > 0
  ) {
    cart = companyWithCarts[0].carts[0]
    logger.info(`  Cart already linked to company (${cart.id}) — skipping`)
  } else {
    // Create cart directly via cart module
    cart = await cartModule.createCarts({
      region_id: region.id,
      currency_code: region.currency_code,
      sales_channel_id: salesChannel?.id,
      customer_id: customer.id,
      email: customer.email,
      metadata: { company_id: company.id, demo: true },
    })

    // Link cart → company
    await link.create({
      [COMPANY_MODULE]: { company_id: company.id },
      [Modules.CART]: { cart_id: cart.id },
    })
    logger.info(`  Cart created and linked: ${cart.id}`)
  }

  // ── Step 5b: Add NZD line items to approval cart (idempotent) ────────────
  //
  // DFA-01: The approval in Step 6 attaches to this cart. If the cart has no
  // line items, admin /app/approvals shows "0 items". We add 1-2 NZD-priced
  // items now so the approval row displays a real item count and NZD subtotal.
  //
  // Idempotency: only add when cart has zero items. Re-running seed:demo when
  // items already exist is a no-op.

  logger.info("Step 5b: Adding NZD line items to approval cart...")

  try {
    const productModule = container.resolve(Modules.PRODUCT)

    // Fetch current cart items to check idempotency
    const cartWithItems = await cartModule.retrieveCart(cart.id, {
      relations: ["items"],
    })
    const currentItems: any[] = (cartWithItems as any).items ?? []

    if (currentItems.length > 0) {
      logger.info(
        `  Cart already has ${currentItems.length} item(s) — skipping line-item seed`
      )
    } else {
      // Prefer Wireless Mouse (NZ$260) — 2 units so cart total NZ$520 > employee limit NZ$200
      const [mouseVariant] = await productModule.listProductVariants({
        sku: "MOUSE-WHITE",
      })
      const [mouseBlackVariant] = await productModule.listProductVariants({
        sku: "MOUSE-BLACK",
      })
      const mouseVar = mouseVariant || mouseBlackVariant

      // Fallback to keyboard if no mouse SKU found
      const [keyboardVariant] = await productModule.listProductVariants({
        sku: "KEYBOARD-BLACK",
      })

      const primaryVariant = mouseVar || keyboardVariant
      if (!primaryVariant) {
        logger.warn(
          `  No known SKU found (MOUSE-WHITE, MOUSE-BLACK, KEYBOARD-BLACK) — ` +
          `run the base seed.ts first. Approval cart will have 0 items.`
        )
      } else {
        const isMouseVariant =
          primaryVariant.sku === "MOUSE-WHITE" ||
          primaryVariant.sku === "MOUSE-BLACK"
        const unitPrice = isMouseVariant ? 260 : 159
        const itemTitle = isMouseVariant
          ? "Wireless Mouse"
          : "Wireless Keyboard | Touch ID | Numeric Keypad (Black)"

        await cartModule.addLineItems(cart.id, [
          {
            variant_id: primaryVariant.id,
            quantity: 2,
            unit_price: unitPrice,
            title: itemTitle,
          },
        ])
        logger.info(
          `  Added 2x ${itemTitle} @ NZ$${unitPrice} to approval cart ` +
          `(total NZ$${unitPrice * 2} > employee limit NZ$${DEMO_EMPLOYEE_SPENDING_LIMIT / 100})`
        )
      }
    }
  } catch (err: any) {
    logger.warn(
      `  Step 5b FAILED (line items) — approval cart will have 0 items. ` +
      `Error: ${err.message}`
    )
  }

  // ── Step 6: Approval (idempotent) ────────────────────────────────────────

  logger.info("Step 6: Approval...")

  const existingApprovals = await approvalModule.listApprovals({
    cart_id: cart.id,
  })

  let approval: any
  if (existingApprovals.length > 0) {
    approval = existingApprovals[0]
    logger.info(
      `  Approval already exists (${approval.id}, status=${approval.status}) — skipping`
    )
  } else {
    // createApprovalsWorkflow reads company.approval_settings via query.graph
    // and creates approval rows based on requires_admin_approval flag.
    const { result: approvals } = await createApprovalsWorkflow(
      container
    ).run({
      input: {
        cart_id: cart.id,
        created_by: customer.id,
        status: ApprovalStatusType.PENDING,
      },
    })
    approval = Array.isArray(approvals) ? approvals[0] : approvals
    logger.info(
      `  Approval created: ${approval.id} (type=${approval.type}, status=${approval.status})`
    )
  }

  // ── Step 7: Quote (idempotent) ───────────────────────────────────────────
  //
  // createRequestForQuoteWorkflow requires a cart with items, shipping, and
  // addresses — too complex for a seed. We create the Quote entity directly
  // via the quote module service. It needs a draft_order_id and
  // order_change_id. We create a minimal draft order + order edit here.

  logger.info("Step 7: Quote...")

  const existingQuotes = await quoteModule.listQuotes({
    customer_id: customer.id,
  })

  if (existingQuotes.length > 0) {
    logger.info(
      `  Quote already exists (${existingQuotes[0].id}) — skipping creation`
    )
  } else {
    // Create a minimal draft order so the quote has a valid draft_order_id
    const { result: draftOrder } = await createOrdersWorkflow(container).run({
      input: {
        is_draft_order: true,
        status: OrderStatus.DRAFT,
        sales_channel_id: salesChannel?.id,
        email: customer.email,
        customer_id: customer.id,
        billing_address: {
          first_name: "Demo",
          last_name: "Buyer",
          address_1: "1 Demo Street",
          city: "Auckland",
          country_code: "nz",
          postal_code: "0622",
        },
        shipping_address: {
          first_name: "Demo",
          last_name: "Buyer",
          address_1: "1 Demo Street",
          city: "Auckland",
          country_code: "nz",
          postal_code: "0622",
        },
        items: [],
        currency_code: region.currency_code,
        region_id: region.id,
        shipping_methods: [],
        promo_codes: [],
      },
    })

    const { result: orderChange } = await beginOrderEditOrderWorkflow(
      container
    ).run({
      input: {
        order_id: draftOrder.id,
        description: "Demo quote request",
        internal_note: "Created by seed-demo-b2b",
        metadata: {},
      },
    })

    const quote = await quoteModule.createQuotes({
      draft_order_id: draftOrder.id,
      cart_id: cart.id,
      customer_id: customer.id,
      order_change_id: orderChange.id,
    })

    logger.info(`  Quote created: ${(quote as any).id} (status=pending_merchant)`)
  }

  // ── Step 8: Completed NZD order (idempotent) ─────────────────────────────
  //
  // Creates one completed, non-draft order for the demo-buyer so that
  // /nz/account/orders renders a real order row (flow-08 order-edit reel).
  //
  // Customer resolution: the seed may have created customer A in Step 3, but
  // the invite-accept or registration flow may have created customer B for the
  // same email. The store API authenticates via JWT actor_id which resolves to
  // app_metadata.customer_id in the auth identity. We must find the auth
  // identity for DEMO_BUYER_EMAIL and use its customer_id for the order, so
  // that /store/orders returns the order for the logged-in buyer.
  //
  // Idempotency: list orders for the resolved customer_id where
  // is_draft_order=false and currency_code=nzd and metadata.demo_completed_order=true.
  //
  // Product line-item: KEYBOARD-BLACK variant (NZD 159 unit_price).
  // Wrapped in try/catch so a failure here does NOT abort the company/quote seed.

  logger.info("Step 8: Completed NZD order for demo-buyer...")

  try {
    const orderModule = container.resolve(Modules.ORDER)
    const productModule = container.resolve(Modules.PRODUCT)

    // Resolve the authoritative customer_id from the emailpass auth identity.
    // The store login uses this identity's app_metadata.customer_id as actor_id.
    let orderCustomerId = customer.id
    try {
      const providerIdentities = await (authModule as any).listProviderIdentities({
        entity_id: DEMO_BUYER_EMAIL,
        provider: "emailpass",
      })
      if (providerIdentities.length > 0) {
        const authIdentity = await (authModule as any).retrieveAuthIdentity(
          providerIdentities[0].auth_identity_id,
          { select: ["id", "app_metadata"] }
        )
        if (authIdentity.app_metadata?.customer_id) {
          orderCustomerId = authIdentity.app_metadata.customer_id
          if (orderCustomerId !== customer.id) {
            logger.info(
              `  Auth identity customer_id (${orderCustomerId}) differs from seed customer (${customer.id}) — ` +
              `using auth identity customer for order so /store/orders returns it`
            )
          }
        }
      }
    } catch (authErr: any) {
      logger.warn(`  Could not resolve auth identity customer_id — using seed customer: ${authErr.message}`)
    }

    // Idempotency check — look for an NZD demo-completed order on the resolved customer.
    const existingOrders = await orderModule.listOrders({
      customer_id: orderCustomerId,
      is_draft_order: false,
      currency_code: region.currency_code,
    })
    const existingDemoOrder = existingOrders.find(
      (o: any) => o.metadata?.demo_completed_order === true
    )

    if (existingDemoOrder) {
      logger.info(
        `  Demo completed order already exists (${existingDemoOrder.id}, ` +
        `currency=${existingDemoOrder.currency_code}, ` +
        `total=${existingDemoOrder.total}) — skipping`
      )
    } else {
      // Find a seeded variant with an NZD price — prefer KEYBOARD-BLACK (SKU)
      const [keyboardVariant] = await productModule.listProductVariants({
        sku: "KEYBOARD-BLACK",
      })

      let variantId: string
      let unitPrice: number
      let itemTitle: string

      if (keyboardVariant) {
        variantId = keyboardVariant.id
        unitPrice = 159 // NZD price from seed.ts
        itemTitle = "Wireless Keyboard | Touch ID | Numeric Keypad (Black)"
      } else {
        // Fallback: find any variant from seeded products
        const allVariants = await productModule.listProductVariants({})
        if (allVariants.length === 0) {
          throw new Error(
            "No product variants found — run the base seed.ts first " +
            "(npx medusa exec ./src/scripts/seed.ts)"
          )
        }
        variantId = allVariants[0].id
        unitPrice = 99 // conservative NZD fallback
        itemTitle = (allVariants[0] as any).title || "Demo Product"
      }

      // Resolve the email for the order customer
      const orderCustomers = await customerModule.listCustomers({ id: orderCustomerId })
      const orderCustomerEmail = orderCustomers.length > 0
        ? orderCustomers[0].email
        : customer.email

      // Create the order in "pending" status first (createOrderWorkflow requirement)
      const { result: newOrder } = await createOrderWorkflow(container).run({
        input: {
          is_draft_order: false,
          status: "pending" as any,
          region_id: region.id,
          currency_code: region.currency_code,
          sales_channel_id: salesChannel?.id,
          email: orderCustomerEmail,
          customer_id: orderCustomerId,
          billing_address: {
            first_name: "Demo",
            last_name: "Buyer",
            address_1: "1 Demo Street",
            city: "Auckland",
            country_code: "nz",
            postal_code: "0622",
          },
          shipping_address: {
            first_name: "Demo",
            last_name: "Buyer",
            address_1: "1 Demo Street",
            city: "Auckland",
            country_code: "nz",
            postal_code: "0622",
          },
          items: [
            {
              variant_id: variantId,
              quantity: 2,
              title: itemTitle,
              unit_price: unitPrice,
            },
          ],
          shipping_methods: [],
          metadata: {
            demo_completed_order: true,
            company_id: company.id,
          },
        },
      })

      // Mark the order as completed
      await completeOrderWorkflow(container).run({
        input: { orderIds: [newOrder.id] },
      })

      // Retrieve refreshed order to log final total
      const [finalOrder] = await orderModule.listOrders({ id: newOrder.id })
      const total = (finalOrder as any)?.total ?? unitPrice * 2

      logger.info(
        `  Demo completed order created: ${newOrder.id} ` +
        `currency=${region.currency_code} ` +
        `total=${total}`
      )
    }
  } catch (err: any) {
    logger.warn(
      `  Step 8 FAILED (completed order) — company/quote seed is unaffected. ` +
      `Error: ${err.message}`
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  logger.info("=== Demo B2B Seed Complete ===")
  logger.info(`  Company:           ${company.id} (${company.name})`)
  logger.info(`  Approval Settings: ${approvalSettings.id} (requires_admin_approval=${approvalSettings.requires_admin_approval})`)
  logger.info(`  Customer:          ${customer.id} (${customer.email})`)
  logger.info(`  Employee:          ${employee.id}`)
  logger.info(`  Cart:              ${cart.id}`)
  logger.info(`  Approval:          ${approval.id} (type=${approval.type}, status=${approval.status})`)
  logger.info("")
  logger.info("  Verify admin pages:")
  logger.info("    http://localhost:9000/app/approvals  — should show ≥1 pending row")
  logger.info("    http://localhost:9000/app/quotes     — should show ≥1 quote row")
}
