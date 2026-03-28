import { describe, expect, it } from 'vitest';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import {
  buildCreateStudioCreatorRosterPayload,
  buildUpdateStudioCreatorRosterPayload,
  UNSET_COMPENSATION_TYPE,
} from '../studio-creator-compensation';

describe('studio creator compensation payload builders', () => {
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
});
