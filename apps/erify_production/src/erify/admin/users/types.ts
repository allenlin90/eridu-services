import { paginatedData } from "@/api/types";
import { z } from "zod";

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string(),
  name: z.string(),
  clerk_uid: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PaginatedUsersSchema = paginatedData.extend({
  data: z.array(UserSchema),
});

export type User = z.infer<typeof UserSchema>;
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;
