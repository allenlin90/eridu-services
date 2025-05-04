import { z } from "zod";

export const ShowMaterialSchema = z.object({
  uid: z.string(),
  brand_uid: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  name: z.string(),
  resource_url: z.string(),
  type: z.string(),
});

export type ShowMaterial = z.infer<typeof ShowMaterialSchema>;
