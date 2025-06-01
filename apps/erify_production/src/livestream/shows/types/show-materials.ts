import { z } from "zod";

export const ShowMaterialSchema = z.object({
  id: z.string(),
  client_id: z.string().nullish(),
  type: z.string(),
  name: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  resource_url: z.string(),
});

export type ShowMaterial = z.infer<typeof ShowMaterialSchema>;
