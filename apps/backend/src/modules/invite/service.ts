import { MedusaService } from "@medusajs/framework/utils";
import { Invite } from "./models";

class InviteModuleService extends MedusaService({
  Invite,
}) {}

export default InviteModuleService;
