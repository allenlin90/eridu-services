import { z } from "zod";

export const paginatedData = z.object({
  object: z.string(),
  data: z.array(z.unknown()),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});
