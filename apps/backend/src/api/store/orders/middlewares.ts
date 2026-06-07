import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { MiddlewareRoute } from "@medusajs/medusa";
import { retrieveOrderTransformQueryConfig } from "./query-config";
import { EditOrderItems } from "./validators";

const GetOrderParams = createFindParams({ limit: 1, offset: 0 });

export const storeOrdersMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/orders*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/store/orders/:id",
    middlewares: [
      validateAndTransformQuery(
        GetOrderParams,
        retrieveOrderTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/orders/:id/edits",
    middlewares: [
      validateAndTransformBody(EditOrderItems),
      validateAndTransformQuery(
        GetOrderParams,
        retrieveOrderTransformQueryConfig
      ),
    ],
  },
];
