import { paginatedData } from "@/api/types";
import { ClientSchema, StudioRoomSchema } from "@/erify/types";
import { z } from "zod";

export const ShowTableRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: ClientSchema,
  studio_room: StudioRoomSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paginatedShowTableRows = paginatedData.extend({
  data: z.array(ShowTableRowSchema),
});

export type ShowTableRow = z.infer<typeof ShowTableRowSchema>;
export type PaginatedShowTableRow = z.infer<typeof paginatedShowTableRows>;
