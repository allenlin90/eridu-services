import { BrandSchema, PlatformSchema, ShowPlatformSchema, ShowSchema, StudioRoomSchema } from "@/erify/types";
import { z } from "zod";

export const ShowDetailsSchema = z.object({
  uid: z.string(),
  brand: BrandSchema,
  platform: PlatformSchema,
  show_platform: ShowPlatformSchema,
  show: ShowSchema,
  studio_room: StudioRoomSchema,
});

export type ShowDetails = z.infer<typeof ShowDetailsSchema>;
