import { describe, expect, it } from 'vitest';

import { STUDIO_ROLE, type StudioMemberResponse } from '@eridu/api-types/memberships';

import { getMemberColumns } from '../member-columns';

function createMember(overrides: Partial<StudioMemberResponse> = {}): StudioMemberResponse {
  return {
    membership_id: 'smb_123',
    user_id: 'user_123',
    user_name: 'Jane Doe',
    user_email: 'jane@example.com',
    role: STUDIO_ROLE.MEMBER,
    base_hourly_rate: null,
    created_at: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('getMemberColumns', () => {
  it('formats hourly rates without JS number precision loss', () => {
    const columns = getMemberColumns({
      studioId: 'std_1',
      isAdmin: false,
      currentUserEmail: undefined,
    });
    const hourlyRateColumn = columns.find((column) => column.header === 'Hourly Rate');
    const cell = hourlyRateColumn?.cell;

    expect(typeof cell).toBe('function');
    expect(
      cell?.({
        row: {
          original: createMember({ base_hourly_rate: '9007199254740993.01' as never }),
        },
      } as never),
    ).toMatchObject({
      props: {
        children: '$9007199254740993.01',
      },
    });
  });
});
