import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/*
  GET /store/orders/:id — customer-scoped order retrieval.
  Two-layer ownership guard: authenticate middleware (Layer 1) + customer_id filter (Layer 2).
*/
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;
  const customerId = req.auth_context.actor_id;

  const {
    data: [order],
  } = await query.graph(
    {
      entity: "order",
      fields: req.queryConfig.fields,
      filters: { id, customer_id: customerId },
    },
    { throwIfKeyNotFound: true }
  );

  return res.json({ order });
};
