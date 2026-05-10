import { describe, expect, it } from 'vitest';

import { systemCompensationLineItemSearchSchema } from '../system-compensation-line-item-search-schema';

describe('systemCompensationLineItemSearchSchema', () => {
  it('parses valid search params with defaults', () => {
    const result = systemCompensationLineItemSearchSchema.parse({});
    expect(result).toEqual({
      page: 1,
      limit: 10,
    });
  });

  it('parses specific pagination and filter values', () => {
    const result = systemCompensationLineItemSearchSchema.parse({
      page: '2',
      limit: '50',
      studio_id: 'stu_123',
      target_type: 'SHOW',
      item_type: 'BONUS',
      include_deleted: 'true',
    });

    expect(result).toEqual({
      page: 2,
      limit: 50,
      studio_id: 'stu_123',
      target_type: 'SHOW',
      item_type: 'BONUS',
      include_deleted: 'true',
    });
  });

  it('falls back to defaults on invalid pagination types', () => {
    const result = systemCompensationLineItemSearchSchema.parse({
      page: 'invalid',
      limit: 'invalid',
    });

    expect(result).toEqual({
      page: 1,
      limit: 10,
    });
  });
});
