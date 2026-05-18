import { describe, expect, it } from 'vitest';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import {
  buildShowCreatorAssignmentTermsPayload,
  isAgreedRateEnabled,
  isCommissionRateEnabled,
  NO_COMPENSATION_TYPE,
} from '../show-creator-assignment-terms';

describe('buildShowCreatorAssignmentTermsPayload', () => {
  it('forces commission_rate to null when switching HYBRID → FIXED with a leftover commission value', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.FIXED,
      commissionRate: '25',
      overrideReason: '',
    });

    expect(payload).toEqual({
      note: null,
      agreed_rate: '100.00',
      compensation_type: CREATOR_COMPENSATION_TYPE.FIXED,
      commission_rate: null,
      override_reason: undefined,
    });
  });

  it('forces agreed_rate to null when type is COMMISSION', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.COMMISSION,
      commissionRate: '25',
      overrideReason: '',
    });

    expect(payload.agreed_rate).toBeNull();
    expect(payload.commission_rate).toBe('25.00');
  });

  it('keeps both rates when type is HYBRID', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.HYBRID,
      commissionRate: '25',
      overrideReason: '',
    });

    expect(payload.agreed_rate).toBe('100.00');
    expect(payload.commission_rate).toBe('25.00');
  });

  it('clears both rates when type is NONE', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: NO_COMPENSATION_TYPE,
      commissionRate: '25',
      overrideReason: '',
    });

    expect(payload).toEqual({
      note: null,
      agreed_rate: null,
      compensation_type: null,
      commission_rate: null,
      override_reason: undefined,
    });
  });

  it('rejects COMMISSION without a commission rate', () => {
    expect(() => buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '',
      compensationType: CREATOR_COMPENSATION_TYPE.COMMISSION,
      commissionRate: '',
      overrideReason: '',
    })).toThrow(/Commission rate is required/);
  });

  it('rejects HYBRID without a commission rate', () => {
    expect(() => buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.HYBRID,
      commissionRate: '',
      overrideReason: '',
    })).toThrow(/Commission rate is required/);
  });

  it('trims note and override_reason', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '  hello  ',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.FIXED,
      commissionRate: '',
      overrideReason: '  negotiated  ',
    });

    expect(payload.note).toBe('hello');
    expect(payload.override_reason).toBe('negotiated');
  });

  it('returns override_reason undefined when empty after trim', () => {
    const payload = buildShowCreatorAssignmentTermsPayload({
      note: '',
      agreedRate: '100',
      compensationType: CREATOR_COMPENSATION_TYPE.FIXED,
      commissionRate: '',
      overrideReason: '   ',
    });

    expect(payload.override_reason).toBeUndefined();
  });
});

describe('isAgreedRateEnabled / isCommissionRateEnabled', () => {
  it.each([
    [CREATOR_COMPENSATION_TYPE.FIXED, true, false],
    [CREATOR_COMPENSATION_TYPE.COMMISSION, false, true],
    [CREATOR_COMPENSATION_TYPE.HYBRID, true, true],
    [NO_COMPENSATION_TYPE, false, false],
  ] as const)('%s → agreed=%s commission=%s', (type, agreed, commission) => {
    expect(isAgreedRateEnabled(type)).toBe(agreed);
    expect(isCommissionRateEnabled(type)).toBe(commission);
  });
});
