import { describe, expect, it } from 'vitest';

import { STUDIO_ROLE, type StudioMemberResponse } from '@eridu/api-types/memberships';

import { buildStudioMemberUpdatePayload } from '../../lib/build-studio-member-update-payload';

function createMember(overrides: Partial<StudioMemberResponse> = {}): StudioMemberResponse {
  return {
    membership_id: 'smb_123',
    user_id: 'user_123',
    user_name: 'Jane Doe',
    user_email: 'jane@example.com',
    role: STUDIO_ROLE.MEMBER,
    base_hourly_rate: 25,
    created_at: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildStudioMemberUpdatePayload', () => {
  it('preserves a null hourly rate when the legacy value is left blank', () => {
    const payload = buildStudioMemberUpdatePayload(
      createMember({ base_hourly_rate: null }),
      STUDIO_ROLE.MANAGER,
      '',
    );

    expect(payload).toEqual({ role: STUDIO_ROLE.MANAGER });
  });

  it('requires a non-empty hourly rate when the member already has one', () => {
    expect(() =>
      buildStudioMemberUpdatePayload(
        createMember({ base_hourly_rate: 25 }),
        STUDIO_ROLE.MANAGER,
        '',
      ),
    ).toThrow('Hourly rate must be a non-negative number');
  });

  it('parses explicit numeric rate updates', () => {
    const payload = buildStudioMemberUpdatePayload(
      createMember({ base_hourly_rate: null }),
      STUDIO_ROLE.MANAGER,
      '0',
    );

    expect(payload).toEqual({
      role: STUDIO_ROLE.MANAGER,
      base_hourly_rate: 0,
    });
  });
});
