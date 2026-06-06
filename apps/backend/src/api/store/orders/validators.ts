import { z } from "zod";

export type EditOrderItemsType = z.infer<typeof EditOrderItems>;
export const EditOrderItems = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          quantity: z.number().int().min(1),
        })
      )
      .min(1),
  })
  .strict();
