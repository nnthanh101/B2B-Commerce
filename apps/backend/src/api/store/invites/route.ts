import crypto from "node:crypto";
import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { COMPANY_MODULE } from "../../../modules/company";
import { INVITE_MODULE } from "../../../modules/invite";
import type InviteModuleService from "../../../modules/invite/service";
import { createEmployeesWorkflow } from "../../../workflows/employee/workflows";
import {
  StoreAcceptInviteType,
  StoreCreateInviteType,
} from "./validators";

/** POST /store/invites — admin creates an invite for an email */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateInviteType>,
  res: MedusaResponse
) => {
  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string;
  };

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Resolve the admin's company
  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["employee.company.id", "employee.is_admin"],
    filters: { id: customer_id },
  });

  const company_id = customer?.employee?.company?.id as string | undefined;
  if (!company_id) {
    return res.status(403).json({ message: "Not associated with a company" });
  }

  // Generate token: random 32-byte hex string
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day TTL

  const inviteService = req.scope.resolve<InviteModuleService>(INVITE_MODULE);

  const invite = await inviteService.createInvites({
    email: req.validatedBody.email,
    company_id,
    token_hash: tokenHash,
    spending_limit: req.validatedBody.spending_limit ?? null,
    expires_at: expiresAt,
    used_at: null,
  });

  // Log token to console for E2E grep — production deployments should email this
  console.log(`[INVITE_TOKEN] invite_id=${invite.id} token=${rawToken}`);

  return res.status(201).json({
    invite: {
      id: invite.id,
      email: invite.email,
      company_id: invite.company_id,
      expires_at: invite.expires_at,
    },
    token_display: rawToken,
  });
};
