import { CompensationItemType, CompensationLineItemTargetType } from '@prisma/client';

import {
  compensationLineItemDto,
  createAdminCompensationLineItemSchema,
  listCompensationLineItemsQuerySchema,
  updateCompensationLineItemSchema,
} from './compensation-line-item.schema';

describe('compensation line item schemas', () => {
  it('normalizes admin create input and trims reason', () => {
    const result = createAdminCompensationLineItemSchema.parse({
      studio_id: 'std_123',
      target_type: 'SHOW',
      target_uid: 'show_123',
      amount: '-25.5',
      item_type: 'DEDUCTION',
      reason: '  late arrival adjustment  ',
      metadata: { source: 'support' },
    });

    expect(result).toEqual({
      studioId: 'std_123',
      targetType: CompensationLineItemTargetType.SHOW,
      targetUid: 'show_123',
      amount: '-25.50',
      itemType: CompensationItemType.DEDUCTION,
      reason: 'late arrival adjustment',
      metadata: { source: 'support' },
    });
  });

  it('rejects blank reasons', () => {
    expect(() =>
      createAdminCompensationLineItemSchema.parse({
        studio_id: 'std_123',
        target_type: 'SHOW',
        target_uid: 'show_123',
        amount: '10.00',
        item_type: 'BONUS',
        reason: '   ',
      }),
    ).toThrow();
  });

  it('rejects target updates because targets are immutable', () => {
    expect(() =>
      updateCompensationLineItemSchema.parse({
        target_uid: 'show_456',
      }),
    ).toThrow();
  });

  it('parses list filters and pagination', () => {
    const result = listCompensationLineItemsQuerySchema.parse({
      page: '2',
      limit: '25',
      studio_id: 'std_123',
      target_type: 'STUDIO_SHIFT_BLOCK',
      target_uid: 'ssb_123',
      item_type: 'OVERTIME',
      created_by_uid: 'user_123',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-08T00:00:00.000Z',
      include_deleted: 'true',
    });

    expect(result).toEqual({
      page: 2,
      limit: 25,
      skip: 25,
      take: 25,
      sort: 'desc',
      studioId: 'std_123',
      targetType: CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK,
      targetUid: 'ssb_123',
      itemType: CompensationItemType.OVERTIME,
      createdByUid: 'user_123',
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-08T00:00:00.000Z'),
      includeDeleted: true,
    });
  });

  it('serializes internal records with only external UIDs', () => {
    const now = new Date('2026-05-09T10:00:00.000Z');
    const result = compensationLineItemDto.parse({
      id: 101n,
      uid: 'cli_123',
      studioId: 201n,
      amount: { toString: () => '75.50' },
      itemType: CompensationItemType.BONUS,
      reason: 'Contest bonus',
      targetType: CompensationLineItemTargetType.SHOW_CREATOR,
      targetId: 301n,
      showId: null,
      showCreatorId: 301n,
      studioShiftId: null,
      studioShiftBlockId: null,
      createdById: 401n,
      metadata: { note: 'support' },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      studio: { uid: 'std_123' },
      createdBy: { uid: 'user_123' },
      show: null,
      showCreator: { uid: 'show_mc_123' },
      studioShift: null,
      studioShiftBlock: null,
    });

    expect(result).toEqual({
      id: 'cli_123',
      studio_id: 'std_123',
      target_type: 'SHOW_CREATOR',
      target_id: 'show_mc_123',
      amount: '75.50',
      item_type: 'BONUS',
      reason: 'Contest bonus',
      metadata: { note: 'support' },
      created_by_id: 'user_123',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    });
  });
});
