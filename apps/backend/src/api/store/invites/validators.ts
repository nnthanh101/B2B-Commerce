import { z } from "zod";

export type StoreCreateInviteType = z.infer<typeof StoreCreateInvite>;
export const StoreCreateInvite = z
  .object({
    email: z.string().email(),
    spending_limit: z.number().nonnegative().optional().nullable(),
  })
  .strict();

export type StoreAcceptInviteType = z.infer<typeof StoreAcceptInvite>;
export const StoreAcceptInvite = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
  .strict();
