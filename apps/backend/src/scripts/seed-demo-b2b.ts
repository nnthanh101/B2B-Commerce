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
import {
  createOrdersWorkflow,
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
          country: "nz",
          logo_url: null,
          currency_code: "nzd",
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

  logger.info("Step 3: Buyer customer...")

  const existingCustomers = await customerModule.listCustomers({
    email: DEMO_BUYER_EMAIL,
  })

  let customer: any
  if (existingCustomers.length > 0) {
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
      if (!authIdentity.app_metadata?.customer_id) {
        await (authModule as any).updateAuthIdentities({
          id: authIdentity.id,
          app_metadata: {
            ...(authIdentity.app_metadata || {}),
            customer_id: customer.id,
          },
        })
        logger.info(`  Auth identity updated: app_metadata.customer_id = ${customer.id}`)
      } else {
        logger.info(`  Auth identity already exists and has customer_id — skipping`)
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
  } else {
    const { result: emp } = await createEmployeesWorkflow(container).run({
      input: {
        // customer_id is NOT a column on Employee — it is stored as a remote link.
        // Pass only the ORM-mapped fields; customerId drives the link step below.
        employeeData: {
          company_id: company.id,
          spending_limit: 500000,
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
          employeeData: {
            company_id: company.id,
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

  // CRITICAL: Find the Oceania (NZD) region by country iso_2 = "nz"
  // This ensures demo quotes and orders show NZD, not EUR (from Europe region)
  let region = regions.find((r: any) =>
    r.countries?.some((c: any) => c.iso_2 === "nz")
  )

  // Fallback: if no Oceania region, use first region (but log warning)
  if (!region) {
    logger.warn(
      "WARNING: No Oceania (nz) region found. Using first region. " +
      "Demo quotes/orders will NOT be in NZD."
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
