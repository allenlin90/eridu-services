import { z } from "zod";

export const McRankingTypes = ["normal", "good", "superstar"] as const;

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const MaterialExpandedSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["script", "scene", "mechanic", "obs_layer", "other"]),
  description: z.string().nullable(),
  resource_url: z.string().url(),
  client: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["script", "scene", "mechanic", "obs_layer", "other"]),
  description: z.string().optional(),
  resource_url: z.string().url(),
  client_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const McSchema = z.object({
  id: z.string(),
  banned: z.boolean(),
  email: z.string().email(),
  ext_id: z.string().optional(),
  metadata: z.record(z.any()),
  name: z.string().min(1),
  ranking: z.enum(McRankingTypes),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PlatformSchema = z.object({
  id: z.string(),
  address_id: z.string().nullish(),
  name: z.string(),
});

export const ShowPlatformSchema = z.object({
  id: z.string(), // show_platform_mc
  is_active: z.boolean(),
  ext_id: z.string().nullable(),
});

export const ShowSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Name is required" }),
  client_id: z.string().min(1).optional(),
  start_time: z.string().refine(
    val => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val),
    { message: "start time is required" },
  ),
  end_time: z.string().refine(
    val => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val),
    { message: "end time is required" },
  ),
  studio_room_id: z.string().min(1).optional(),
});

export const StudioSchema = z.object({
  id: z.string(),
  name: z.string(),
  address_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const StudioRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["s", "m", "l"]),
  studio_id: z.string(),
});

export type Client = z.infer<typeof ClientSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type MC = z.infer<typeof McSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type ShowPlatform = z.infer<typeof ShowPlatformSchema>;
export type Show = z.infer<typeof ShowSchema>;
export type Studio = z.infer<typeof StudioSchema>;
export type StudioRoom = z.infer<typeof StudioRoomSchema>;
