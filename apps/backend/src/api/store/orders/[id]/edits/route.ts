import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { editOrderItemQuantityWorkflow } from "../../../../../workflows/order/workflows";
import { EditOrderItemsType } from "../../validators";

/*
  POST /store/orders/:id/edits — buyer edits line item quantity on their own order.

  Two-layer ownership guard:
    Layer 1: authenticate('customer',['session','bearer']) middleware (middlewares.ts)
    Layer 2: query.graph ownership check below — non-owner → 404, no order-change created.

  Composition mirrors customer-accept-quote.ts:
    begin → update-item-quantity → confirm (all via the wrapper workflow)
*/
export const POST = async (
  req: AuthenticatedMedusaRequest<EditOrderItemsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;
  const customerId = req.auth_context.actor_id;

  // Layer 2: ownership guard — query scoped by both id AND customer_id
  const {
    data: [order],
  } = await query.graph(
    {
      entity: "order",
      fields: ["id", "status", "customer_id"],
      filters: { id, customer_id: customerId },
    },
    { throwIfKeyNotFound: true }
  );

  // Run the wrapper workflow: begin → update-qty → confirm
  await editOrderItemQuantityWorkflow(req.scope).run({
    input: {
      order_id: order.id,
      customer_id: customerId,
      items: req.validatedBody.items,
    },
  });

  // Re-fetch the updated order to reflect new quantities + recomputed totals (AC-2)
  const {
    data: [updatedOrder],
  } = await query.graph(
    {
      entity: "order",
      fields: req.queryConfig.fields,
      filters: { id: order.id, customer_id: customerId },
    },
    { throwIfKeyNotFound: true }
  );

  return res.json({ order: updatedOrder });
};
