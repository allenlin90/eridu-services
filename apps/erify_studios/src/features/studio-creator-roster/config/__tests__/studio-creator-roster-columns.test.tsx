import { describe, expect, it } from 'vitest';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';

import { getStudioCreatorRosterColumns } from '../studio-creator-roster-columns';

function createCreator(overrides: Partial<StudioCreatorRosterItem> = {}): StudioCreatorRosterItem {
  return {
    id: 'scr_123',
    creator_id: 'creator_123',
    creator_name: 'Jane Creator',
    creator_alias_name: '',
    default_rate: null,
    default_rate_type: CREATOR_COMPENSATION_TYPE.FIXED,
    default_commission_rate: null,
    is_active: true,
    version: 1,
    metadata: {},
    created_at: '2026-03-27T00:00:00.000Z',
    updated_at: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('getStudioCreatorRosterColumns', () => {
  it('shows the actions column for compensation managers', () => {
    const adminColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      canManageRoster: true,
      canReviewCompensation: true,
    });
    const managerColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      canManageRoster: false,
      canReviewCompensation: true,
    });
    const talentManagerColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      canManageRoster: true,
      canReviewCompensation: false,
    });
    const readOnlyColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      canManageRoster: false,
      canReviewCompensation: false,
    });

    expect(adminColumns.some((column) => column.id === 'actions')).toBe(true);
    expect(managerColumns.some((column) => column.id === 'actions')).toBe(true);
    expect(talentManagerColumns.some((column) => column.id === 'actions')).toBe(true);
    expect(readOnlyColumns.some((column) => column.id === 'actions')).toBe(false);
  });

  it('formats default rate and commission without JS number precision loss', () => {
    const columns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      canManageRoster: false,
      canReviewCompensation: false,
    });
    const creator = createCreator({
      default_rate: '9007199254740993.01',
      default_commission_rate: '0.30',
    });
    const defaultRateColumn = columns.find((column) => column.header === 'Default Rate');
    const commissionColumn = columns.find((column) => column.header === 'Commission');

    expect(typeof defaultRateColumn?.cell).toBe('function');
    expect(typeof commissionColumn?.cell).toBe('function');
    const renderDefaultRate = defaultRateColumn?.cell as ((context: unknown) => unknown) | undefined;
    const renderCommission = commissionColumn?.cell as ((context: unknown) => unknown) | undefined;
    expect(renderDefaultRate?.({ row: { original: creator } } as never)).toBe('$9007199254740993.01');
    expect(renderCommission?.({ row: { original: creator } } as never)).toBe('0.30%');
  });
});
