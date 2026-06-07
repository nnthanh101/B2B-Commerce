import { Module } from "@medusajs/framework/utils";
import InviteModuleService from "./service";

export const INVITE_MODULE = "b2b_invite";

export default Module(INVITE_MODULE, {
  service: InviteModuleService,
});
