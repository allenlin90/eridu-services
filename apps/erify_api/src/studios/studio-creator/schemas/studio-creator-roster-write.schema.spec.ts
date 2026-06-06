import {
  createStudioCreatorRosterInputSchema,
  updateStudioCreatorRosterInputSchema,
  updateStudioShowCreatorInputSchema,
} from '@eridu/api-types/studio-creators';

describe('createStudioCreatorRosterInputSchema', () => {
  it('accepts decimal strings without coercing through numbers', () => {
    const result = createStudioCreatorRosterInputSchema.safeParse({
      creator_id: 'creator_00000000000000000001',
      default_rate: '9007199254740993.01',
      default_rate_type: 'FIXED',
      default_commission_rate: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_rate).toBe('9007199254740993.01');
    }
  });

  it('rejects numeric decimal inputs at the API boundary', () => {
    const result = createStudioCreatorRosterInputSchema.safeParse({
      creator_id: 'creator_00000000000000000001',
      default_rate: 500,
      default_rate_type: 'FIXED',
      default_commission_rate: null,
    });

    expect(result.success).toBe(false);
  });
});

describe('updateStudioCreatorRosterInputSchema', () => {
  it('allows commission-based updates without resending an unchanged commission rate', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
    });

    expect(result.success).toBe(true);
  });

  it('still rejects explicitly null commission for commission-based updates', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
      default_commission_rate: null,
    });

    expect(result.success).toBe(false);
  });

  it('keeps commission decimal strings intact', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
      default_commission_rate: '12.50',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_commission_rate).toBe('12.50');
    }
  });

  it('accepts a commission rate at the 100 upper bound', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
      default_commission_rate: '100.00',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_commission_rate).toBe('100.00');
    }
  });

  it('rejects a commission rate just over 100', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
      default_commission_rate: '100.01',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a commission rate well above 100', () => {
    const result = updateStudioCreatorRosterInputSchema.safeParse({
      version: 2,
      default_rate_type: 'HYBRID',
      default_commission_rate: '200',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateStudioShowCreatorInputSchema', () => {
  it('keeps show creator rate decimal strings intact', () => {
    const result = updateStudioShowCreatorInputSchema.safeParse({
      agreed_rate: '9007199254740993.01',
      compensation_type: 'HYBRID',
      commission_rate: '12.50',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agreed_rate).toBe('9007199254740993.01');
      expect(result.data.commission_rate).toBe('12.50');
    }
  });

  it('rejects numeric show creator rate inputs', () => {
    const result = updateStudioShowCreatorInputSchema.safeParse({
      agreed_rate: 500,
      compensation_type: 'FIXED',
      commission_rate: null,
    });

    expect(result.success).toBe(false);
  });
});
