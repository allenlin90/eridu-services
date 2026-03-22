import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

export const showsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(MIN_LIMIT).max(MAX_LIMIT).optional().catch(undefined),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  startDate: z.string().optional().catch(undefined),
  endDate: z.string().optional().catch(undefined),
});

export type ShowsSearch = z.infer<typeof showsSearchSchema>;

export function shouldNormalizeShowsSearch(search: ShowsSearch): boolean {
  return search.limit === undefined;
}

export function toCanonicalShowsSearch(search: ShowsSearch): ShowsSearch {
  return {
    ...search,
    page: search.page ?? DEFAULT_PAGE,
    limit: search.limit ?? DEFAULT_LIMIT,
  };
}
