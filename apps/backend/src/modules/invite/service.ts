import crypto from "node:crypto";
import { MedusaService } from "@medusajs/framework/utils";
import type { InferTypeOf } from "@medusajs/framework/types";
import { Invite } from "./models";

// `Invite` is a DML model *value* (model.define(...)), not a type. The runtime
// entity shape is inferred via InferTypeOf so methods can be typed correctly.
type InviteDTO = InferTypeOf<typeof Invite>;

class InviteModuleService extends MedusaService({
  Invite,
}) {
  async accept(token: string): Promise<InviteDTO> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [invite] = await this.listInvites({ token_hash: tokenHash });

    if (!invite) {
      throw new Error("Invalid or expired invite token");
    }

    if (invite.used_at) {
      throw new Error("Invite has already been used");
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("Invite has expired");
    }

    return invite;
  }

  async markUsed(inviteId: string): Promise<InviteDTO> {
    const updated = (await this.updateInvites({
      id: inviteId,
      used_at: new Date(),
    })) as unknown as InviteDTO[];
    return updated[0];
  }
}

export default InviteModuleService;
