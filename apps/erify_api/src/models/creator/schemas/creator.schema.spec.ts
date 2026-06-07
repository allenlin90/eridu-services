import { createCreatorSchema, updateCreatorSchema } from './creator.schema';

describe('createCreatorSchema', () => {
  it('accepts decimal rate strings without coercing through numbers', () => {
    const result = createCreatorSchema.safeParse({
      name: 'Creator',
      alias_name: 'creator',
      default_rate: '9007199254740993.01',
      default_rate_type: 'COMMISSION',
      default_commission_rate: '12.50',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRate).toBe('9007199254740993.01');
      expect(result.data.defaultCommissionRate).toBe('12.50');
    }
  });

  it('rejects numeric decimal inputs at the API boundary', () => {
    const result = createCreatorSchema.safeParse({
      name: 'Creator',
      alias_name: 'creator',
      default_rate: 500,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-positive default rate', () => {
    const result = createCreatorSchema.safeParse({
      name: 'Creator',
      alias_name: 'creator',
      default_rate: '0.00',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a commission rate above 100', () => {
    const result = createCreatorSchema.safeParse({
      name: 'Creator',
      alias_name: 'creator',
      default_commission_rate: '100.01',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a commission rate at the 100 upper bound', () => {
    const result = createCreatorSchema.safeParse({
      name: 'Creator',
      alias_name: 'creator',
      default_commission_rate: '100.00',
    });

    expect(result.success).toBe(true);
  });
});

describe('updateCreatorSchema', () => {
  it('keeps decimal rate strings intact', () => {
    const result = updateCreatorSchema.safeParse({
      default_rate: '600.00',
      default_commission_rate: '10',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRate).toBe('600.00');
      expect(result.data.defaultCommissionRate).toBe('10');
    }
  });

  it('passes through an explicit null to clear a rate', () => {
    const result = updateCreatorSchema.safeParse({
      default_rate: null,
      default_commission_rate: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRate).toBeNull();
      expect(result.data.defaultCommissionRate).toBeNull();
    }
  });

  it('leaves omitted rate fields undefined', () => {
    const result = updateCreatorSchema.safeParse({ name: 'Renamed' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRate).toBeUndefined();
      expect(result.data.defaultCommissionRate).toBeUndefined();
    }
  });

  it('rejects numeric decimal inputs at the API boundary', () => {
    const result = updateCreatorSchema.safeParse({ default_rate: 600 });

    expect(result.success).toBe(false);
  });
});
