import {
  ClientSchema,
  StudioRoomSchema,
} from "@/erify/types";
import { z } from "zod";

export const ShowDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_time: z.string().refine(
    val => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val),
    { message: "start time is required" },
  ),
  end_time: z.string().refine(
    val => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val),
    { message: "end time is required" },
  ),
  client: ClientSchema,
  studio_room: StudioRoomSchema,
});

export type ShowDetails = z.infer<typeof ShowDetailsSchema>;
