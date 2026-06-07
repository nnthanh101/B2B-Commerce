import { createCartWorkflow } from "@medusajs/core-flows";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import { COMPANY_MODULE } from "../../modules/company";
import { CartDTO } from "@medusajs/framework/types";

createCartWorkflow.hooks.cartCreated(
  async (
    { cart },
    { container }
  ): Promise<
    | StepResponse<undefined, null>
    | StepResponse<undefined, { cart_id: string; company_id: string }>
  > => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const cartInputdata = cart as CartDTO;

    // Primary path: company_id supplied in metadata (storefront getOrSetCart).
    let companyId: string | undefined =
      cartInputdata.metadata?.company_id as string | undefined;

    // Fallback path: when a cart is created without metadata.company_id (e.g.
    // the E2E fixture or direct API calls), look up the customer's employee link.
    // This is idempotent-safe — if no employee link exists (guest cart) we skip.
    if (!companyId && cartInputdata.customer_id) {
      try {
        const { data: customers } = await query.graph({
          entity: "customer",
          fields: ["id", "employee.company_id"],
          filters: { id: cartInputdata.customer_id },
        });
        const employeeCompanyId = customers[0]?.employee?.company_id;
        if (employeeCompanyId) {
          companyId = employeeCompanyId;
        }
      } catch {
        // If the query fails (e.g. no employee link table yet), skip gracefully.
      }
    }

    if (!companyId) {
      return new StepResponse(undefined, null);
    }

    // Guard: skip if a company-cart link already exists for this cart to avoid
    // duplicate link errors on idempotent re-runs.
    try {
      const { data: existingLinks } = await query.graph({
        entity: "cart",
        fields: ["id", "company.id"],
        filters: { id: cartInputdata.id },
      });
      if (existingLinks[0]?.company?.id) {
        return new StepResponse(undefined, null);
      }
    } catch {
      // If the query fails, proceed to create the link.
    }

    await remoteLink.create({
      [COMPANY_MODULE]: {
        company_id: companyId,
      },
      [Modules.CART]: {
        cart_id: cartInputdata.id,
      },
    });

    return new StepResponse(undefined, {
      cart_id: cartInputdata.id,
      company_id: companyId,
    });
  },
  async (
    input: { cart_id: string; company_id: string } | null | undefined,
    { container }
  ) => {
    if (!input) {
      return;
    }

    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    await remoteLink.dismiss({
      [COMPANY_MODULE]: {
        company_id: input.company_id,
      },
      [Modules.CART]: {
        cart_id: input.cart_id,
      },
    });
  }
);
