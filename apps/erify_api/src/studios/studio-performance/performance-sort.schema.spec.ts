import {
  parsePerformanceSort,
  performanceShowsQuerySchema,
} from '@eridu/api-types/performance';

describe('performance sort schema', () => {
  const baseQuery = {
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-06-05T23:59:59.999Z',
  };

  describe('parsePerformanceSort', () => {
    it('parses comma-separated field:direction pairs in priority order', () => {
      expect(parsePerformanceSort('gmv:desc,ctr:asc')).toEqual([
        { field: 'gmv', desc: true },
        { field: 'ctr', desc: false },
      ]);
    });

    it('tolerates whitespace and empty segments', () => {
      expect(parsePerformanceSort(' views:desc , ,start_time:asc ')).toEqual([
        { field: 'views', desc: true },
        { field: 'start_time', desc: false },
      ]);
    });

    it('returns null for an unknown field', () => {
      expect(parsePerformanceSort('revenue:desc')).toBeNull();
    });

    it('returns null for an invalid direction', () => {
      expect(parsePerformanceSort('gmv:upwards')).toBeNull();
      expect(parsePerformanceSort('gmv')).toBeNull();
    });
  });

  describe('performanceShowsQuerySchema', () => {
    it('transforms a valid sort string into typed rules', () => {
      const parsed = performanceShowsQuerySchema.parse({
        ...baseQuery,
        sort: 'gmv:desc,views:asc',
      });

      expect(parsed.sort).toEqual([
        { field: 'gmv', desc: true },
        { field: 'views', desc: false },
      ]);
    });

    it('rejects an invalid sort field with a descriptive error', () => {
      const result = performanceShowsQuerySchema.safeParse({
        ...baseQuery,
        sort: 'unknown:desc',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('start_time, gmv, views, ctr, cto');
    });

    it('leaves sort undefined when omitted', () => {
      const parsed = performanceShowsQuerySchema.parse(baseQuery);
      expect(parsed.sort).toBeUndefined();
    });
  });
});
