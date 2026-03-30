import { describe, expect, it } from 'vitest';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import {
  buildCreateStudioCreatorRosterPayload,
  buildOnboardStudioCreatorPayload,
  buildUpdateStudioCreatorRosterPayload,
  UNSET_COMPENSATION_TYPE,
} from '../studio-creator-compensation';

describe('studio creator compensation payload builders', () => {
  it('omits untouched compensation fields for create payloads', () => {
    const payload = buildCreateStudioCreatorRosterPayload({
      creatorId: 'creator_123',
      defaultRate: '',
      defaultRateType: UNSET_COMPENSATION_TYPE,
      defaultCommissionRate: '',
    });

    expect(payload).toEqual({
      creator_id: 'creator_123',
    });
  });

  it('builds a FIXED create payload with null commission', () => {
    const payload = buildCreateStudioCreatorRosterPayload({
      creatorId: 'creator_123',
      defaultRate: '500',
      defaultRateType: CREATOR_COMPENSATION_TYPE.FIXED,
      defaultCommissionRate: '',
    });

    expect(payload).toEqual({
      creator_id: 'creator_123',
      default_rate: 500,
      default_rate_type: CREATOR_COMPENSATION_TYPE.FIXED,
      default_commission_rate: null,
    });
  });

  it('builds an unset update payload with null type and commission', () => {
    const payload = buildUpdateStudioCreatorRosterPayload({
      version: 3,
      defaultRate: '',
      defaultRateType: UNSET_COMPENSATION_TYPE,
      defaultCommissionRate: '',
      isActive: false,
    });

    expect(payload).toEqual({
      version: 3,
      default_rate: null,
      default_rate_type: null,
      default_commission_rate: null,
      is_active: false,
    });
  });

  it('requires commission for commission and hybrid payloads', () => {
    expect(() =>
      buildCreateStudioCreatorRosterPayload({
        creatorId: 'creator_123',
        defaultRate: '0',
        defaultRateType: CREATOR_COMPENSATION_TYPE.COMMISSION,
        defaultCommissionRate: '',
      }),
    ).toThrow('Default commission rate is required');
  });

  it('builds onboarding payload with creator identity and optional user link', () => {
    const payload = buildOnboardStudioCreatorPayload({
      name: 'Alice Example',
      aliasName: 'Alice',
      userId: 'user_123',
      defaultRate: '500',
      defaultRateType: CREATOR_COMPENSATION_TYPE.FIXED,
      defaultCommissionRate: '',
    });

    expect(payload).toEqual({
      creator: {
        name: 'Alice Example',
        alias_name: 'Alice',
        user_id: 'user_123',
        metadata: undefined,
      },
      roster: {
        default_rate: 500,
        default_rate_type: CREATOR_COMPENSATION_TYPE.FIXED,
        default_commission_rate: null,
        metadata: undefined,
      },
    });
  });

  it('requires creator name and alias in onboarding payloads', () => {
    expect(() =>
      buildOnboardStudioCreatorPayload({
        name: '   ',
        aliasName: 'Alice',
        defaultRate: '',
        defaultRateType: UNSET_COMPENSATION_TYPE,
        defaultCommissionRate: '',
      }),
    ).toThrow('Creator name is required');

    expect(() =>
      buildOnboardStudioCreatorPayload({
        name: 'Alice Example',
        aliasName: '   ',
        defaultRate: '',
        defaultRateType: UNSET_COMPENSATION_TYPE,
        defaultCommissionRate: '',
      }),
    ).toThrow('Creator alias is required');
  });
});
