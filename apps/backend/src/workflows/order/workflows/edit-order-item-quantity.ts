import {
  beginOrderEditOrderWorkflow,
  confirmOrderEditRequestWorkflow,
  orderEditUpdateItemQuantityWorkflow,
} from "@medusajs/core-flows";
import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk";

type EditOrderItemQuantityInput = {
  order_id: string;
  customer_id: string;
  items: { id: string; quantity: number }[];
};

/*
  A workflow that edits the quantity of existing line items on a customer order.

  Mirrors the customer-accept-quote.ts composition:
    1. beginOrderEditOrderWorkflow — opens an order-change
    2. orderEditUpdateItemQuantityWorkflow — applies the qty delta
    3. confirmOrderEditRequestWorkflow — commits the order-change
*/
export const editOrderItemQuantityWorkflow = createWorkflow(
  "b2b-edit-order-item-quantity-workflow",
  function (input: EditOrderItemQuantityInput) {
    beginOrderEditOrderWorkflow.runAsStep({
      input: {
        order_id: input.order_id,
        created_by: input.customer_id,
      },
    });

    orderEditUpdateItemQuantityWorkflow.runAsStep({
      input: {
        order_id: input.order_id,
        items: input.items,
      },
    });

    const result = confirmOrderEditRequestWorkflow.runAsStep({
      input: {
        order_id: input.order_id,
        confirmed_by: input.customer_id,
      },
    });

    return new WorkflowResponse(result);
  }
);
