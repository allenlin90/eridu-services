import { describe, expect, it } from 'vitest';

import { adminCompensationLineItemKeys } from '../compensation-line-items.api';

describe('adminCompensationLineItemKeys', () => {
  it('generates base keys correctly', () => {
    expect(adminCompensationLineItemKeys.all).toEqual(['admin-compensation-line-items']);
    expect(adminCompensationLineItemKeys.lists()).toEqual(['admin-compensation-line-items', 'list']);
    expect(adminCompensationLineItemKeys.details()).toEqual(['admin-compensation-line-items', 'detail']);
  });

  it('generates list keys with params', () => {
    expect(
      adminCompensationLineItemKeys.list({ page: 1, limit: 10, studio_id: 'stu_1' }),
    ).toEqual(['admin-compensation-line-items', 'list', { page: 1, limit: 10, studio_id: 'stu_1' }]);
  });

  it('generates detail key with id', () => {
    expect(adminCompensationLineItemKeys.detail('cmp_123')).toEqual([
      'admin-compensation-line-items',
      'detail',
      'cmp_123',
    ]);
  });
});
