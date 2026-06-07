import crypto from "node:crypto";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { COMPANY_MODULE } from "../../../../modules/company";
import { INVITE_MODULE } from "../../../../modules/invite";
import type InviteModuleService from "../../../../modules/invite/service";
import { createEmployeesWorkflow } from "../../../../workflows/employee/workflows";
import { StoreAcceptInviteType } from "../validators";

/** GET /store/invites/accept?token=<raw_token> — public: validate token without consuming it */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    return res.status(400).json({ valid: false, reason: "missing_token" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const inviteService = req.scope.resolve<InviteModuleService>(INVITE_MODULE);
  const [invite] = await inviteService.listInvites({ token_hash: tokenHash });

  if (!invite) {
    return res.status(400).json({ valid: false, reason: "not_found" });
  }
  if (invite.used_at) {
    return res.status(400).json({ valid: false, reason: "already_used" });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ valid: false, reason: "expired" });
  }

  return res.status(200).json({ valid: true });
};

/** POST /store/invites/accept — public endpoint: redeem token, create customer + employee */
export const POST = async (
  req: MedusaRequest<StoreAcceptInviteType>,
  res: MedusaResponse
) => {
  const { token, password, first_name, last_name } = req.validatedBody;

  const inviteService = req.scope.resolve<InviteModuleService>(INVITE_MODULE);

  let invite;
  try {
    invite = await inviteService.accept(token);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }

  // Register the customer via Medusa auth
  const authService = req.scope.resolve(Modules.AUTH);
  const customerService = req.scope.resolve(Modules.CUSTOMER);

  let authIdentity: any;
  try {
    const { success, authIdentity: identity, error } = await authService.authenticate(
      "emailpass",
      {
        url: req.url,
        headers: req.headers as Record<string, string>,
        query: {},
        body: { email: invite.email, password },
        authScope: "store",
      }
    );

    if (!success) {
      // Customer does not exist yet — register
      const registerResult = await authService.register("emailpass", {
        url: req.url,
        headers: req.headers as Record<string, string>,
        query: {},
        body: { email: invite.email, password },
        authScope: "store",
      });

      if (!registerResult.success) {
        return res.status(400).json({
          message: registerResult.error ?? "Failed to register customer",
        });
      }
      authIdentity = registerResult.authIdentity;
    } else {
      authIdentity = identity;
    }
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Auth error" });
  }

  // Retrieve or create the customer record linked to this auth identity
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  let customerId: string;

  const existingCustomers = await customerService.listCustomers({
    email: invite.email,
  });

  if (existingCustomers.length > 0) {
    customerId = existingCustomers[0].id;
  } else {
    const newCustomer = await customerService.createCustomers({
      email: invite.email,
      first_name: first_name ?? undefined,
      last_name: last_name ?? undefined,
    });
    customerId = newCustomer.id;
  }

  // Create employee record + link to customer via existing workflow
  const { result: employee } = await createEmployeesWorkflow.run({
    input: {
      employeeData: {
        company_id: invite.company_id,
        spending_limit: invite.spending_limit ?? 0,
        is_admin: false,
      },
      customerId,
    },
    container: req.scope,
  });

  // Mark invite used (single-use)
  await inviteService.markUsed(invite.id);

  return res.status(200).json({
    success: true,
    customer_id: customerId,
    employee_id: employee.id,
  });
};
