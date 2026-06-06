import crypto from "node:crypto";
import { MedusaService } from "@medusajs/framework/utils";
import { Invite } from "./models";

class InviteModuleService extends MedusaService({
  Invite,
}) {
  async accept(token: string): Promise<Invite> {
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

  async markUsed(inviteId: string): Promise<Invite> {
    return (await this.updateInvites({
      id: inviteId,
      used_at: new Date(),
    }))[0];
  }
}

export default InviteModuleService;
