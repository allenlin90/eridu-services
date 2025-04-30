import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// Define a schema for validation using zod
const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a positive integer")
    .transform(Number)
    .nullable()
    .optional(),
  size: z
    .string()
    .regex(/^\d+$/, "Size must be a positive integer")
    .transform(Number)
    .nullable()
    .optional(),
});

type Params = { offset: string; limit: string };

export const usePaginationParams = (): {
  params: Params | null;
  error: Error | null;
} => {
  const [error, setError] = useState<Error | null>(null);
  const [searchParams] = useSearchParams();

  const params = useMemo(() => {
    try {
      // Parse and validate the search parameters
      const parsedParams = paginationSchema.parse({
        page: searchParams.get("page"),
        size: searchParams.get("size"),
      });

      // Calculate offset and limit
      const page = parsedParams.page ?? DEFAULT_PAGE;
      const size = parsedParams.size ?? DEFAULT_PAGE_SIZE;
      const offset = `${(page - 1) * size}`;
      const limit = `${size}`;

      return { offset, limit };
    }
    catch (err: any) {
      let error = err;
      if (err instanceof z.ZodError) {
        error = new Error (err.errors.map(e => e.message).join(", "));
      }
      else {
        error = new Error("An unknown error occurred");
      }
      setError(error);

      return null;
    }
  }, [searchParams]);

  return { params, error };
};

export default usePaginationParams;
