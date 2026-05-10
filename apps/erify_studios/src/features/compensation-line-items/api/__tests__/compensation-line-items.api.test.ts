import { describe, expect, it } from 'vitest';

import { adminCompensationLineItemKeys } from '../compensation-line-items.api';

describe('adminCompensationLineItemKeys', () => {
  it('generates the system list root key', () => {
    expect(adminCompensationLineItemKeys.all).toEqual(['compensation-line-items', 'system']);
  });

  it('generates list keys with params', () => {
    expect(
      adminCompensationLineItemKeys.list({ page: 1, limit: 10, studio_id: 'stu_1' }),
    ).toEqual([
      'compensation-line-items',
      'system',
      { page: 1, limit: 10, studio_id: 'stu_1' },
    ]);
  });

  it('generates detail key shared across system and target views', () => {
    expect(adminCompensationLineItemKeys.detail('cmp_123')).toEqual([
      'compensation-line-item',
      'cmp_123',
    ]);
  });
});
