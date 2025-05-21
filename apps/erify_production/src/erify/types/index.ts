import { z } from "zod";

export const BrandSchema = z.object({
  uid: z.string(),
  name: z.string(),
});

export const McSchema = z.object({
  uid: z.string(),
  name: z.string().min(1),
  user_uid: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PlatformSchema = z.object({
  uid: z.string(),
  name: z.string(),
});

export const ShowPlatformSchema = z.object({
  uid: z.string(), // show_platform_mc
  is_active: z.boolean(),
  alias_id: z.string().nullable(),
});

export const ShowSchema = z.object({
  uid: z.string(),
  name: z.string(),
  brand_uid: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

export const StudioSchema = z.object({
  uid: z.string(),
  name: z.string(),
  address_uid: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const StudioRoomSchema = z.object({
  uid: z.string(),
  name: z.string(),
  type: z.enum(["s", "m", "l"]),
  studio_uid: z.string(),
});

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string(),
  name: z.string(),
  ext_uid: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Brand = z.infer<typeof BrandSchema>;
export type MC = z.infer<typeof McSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type ShowPlatform = z.infer<typeof ShowPlatformSchema>;
export type Show = z.infer<typeof ShowSchema>;
export type Studio = z.infer<typeof StudioSchema>;
export type StudioRoom = z.infer<typeof StudioRoomSchema>;
export type User = z.infer<typeof UserSchema>;
