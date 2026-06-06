import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework";
import { authenticate } from "@medusajs/medusa";
import { StoreAcceptInvite, StoreCreateInvite } from "./validators";

export const storeInvitesMiddlewares: MiddlewareRoute[] = [
  // Create invite: authenticated company admin only
  {
    method: ["POST"],
    matcher: "/store/invites",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreCreateInvite),
    ],
  },
  // Accept invite: public (no auth required — new user registering)
  {
    method: ["POST"],
    matcher: "/store/invites/accept",
    middlewares: [validateAndTransformBody(StoreAcceptInvite)],
  },
];
