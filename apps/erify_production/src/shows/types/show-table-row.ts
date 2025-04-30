import { paginatedData } from "@/api/types";
import { z } from "zod";

export const ShowTableRowSchema = z.object({
  uid: z.string(),
  alias_id: z.string().nullable(),
  brand: z.string(),
  is_active: z.boolean(),
  name: z.string(),
  studio_room: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

export const paginatedShowTableRows = paginatedData.extend({
  data: z.array(ShowTableRowSchema),
});

export type ShowTableRow = z.infer<typeof ShowTableRowSchema>;
export type PaginatedShowTableRow = z.infer<typeof paginatedShowTableRows>;
