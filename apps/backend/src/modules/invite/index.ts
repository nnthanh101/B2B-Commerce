import { Module } from "@medusajs/framework/utils";
import InviteModuleService from "./service";

export const INVITE_MODULE = "invite";

export default Module(INVITE_MODULE, {
  service: InviteModuleService,
});
