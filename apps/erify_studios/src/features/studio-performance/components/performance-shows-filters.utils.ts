/**
 * Shared param shape + helper for the performance shows table and its filter
 * fields. `PerformanceSearch` mirrors the route's URL search; `toArrayParam`
 * normalizes the multi-select filters that may arrive as a single string or an
 * array from the URL.
 */
export type PerformanceSearch = {
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  client_id?: string;
  show_type_id?: string | string[];
  platform_id?: string | string[];
  show_standard_id?: string | string[];
  name?: string;
  has_performance?: 'all' | 'true' | 'false';
  sort?: string;
};

export function toArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val)
    return undefined;
  return Array.isArray(val) ? val : [val];
}
