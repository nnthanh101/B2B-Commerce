import { model } from "@medusajs/framework/utils";

export const Invite = model.define("b2b_invite", {
  id: model
    .id({
      prefix: "inv",
    })
    .primaryKey(),
  email: model.text(),
  company_id: model.text(),
  token_hash: model.text(),
  spending_limit: model.bigNumber().nullable(),
  expires_at: model.dateTime(),
  used_at: model.dateTime().nullable(),
});
