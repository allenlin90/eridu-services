import { z } from 'zod';

export const compensationsSearchSchema = z.object({
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
});

export type CompensationsSearch = z.infer<typeof compensationsSearchSchema>;

/**
 * Returns a default 30-day date range in ISO strings (local start of day 30 days ago to local end of day today)
 */
export function getInitialDateRange() {
  const dateTo = new Date();
  dateTo.setHours(23, 59, 59, 999);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  dateFrom.setHours(0, 0, 0, 0);

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}
