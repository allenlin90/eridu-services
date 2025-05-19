import { z } from "zod";

export const paginatedData = z.object({
  object: z.string(),
  data: z.array(z.unknown()),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

export const paginatedDataSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    object: z.string(),
    data: z.array(item),
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  });

export type PaginatedData<T> = Omit<z.infer<ReturnType<typeof paginatedDataSchema<z.ZodTypeAny>>>, "data"> & { data: T[] };
