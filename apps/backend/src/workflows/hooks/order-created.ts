import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createOrderWorkflow } from "@medusajs/medusa/core-flows";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import { COMPANY_MODULE } from "../../modules/company";

createOrderWorkflow.hooks.orderCreated(
  async ({ order }, { container }): Promise<StepResponse<undefined, string | null>> => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    if (!order.metadata?.company_id) {
      return new StepResponse(undefined, null);
    }

    await remoteLink.create({
      [Modules.ORDER]: {
        order_id: order.id,
      },
      [COMPANY_MODULE]: {
        company_id: order.metadata?.company_id,
      },
    });

    return new StepResponse(undefined, order.id);
  },
  async (orderId: string | null | undefined, { container }) => {
    if (!orderId) {
      return;
    }

    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    await remoteLink.dismiss({
      [Modules.ORDER]: {
        order_id: orderId,
      },
    });
  }
);
