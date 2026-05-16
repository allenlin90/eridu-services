import { createStudioShiftSchema, updateStudioShiftSchema } from './studio-shift.schema';

const baseCreatePayload = {
  user_id: 'user_abc',
  date: '2026-03-05',
  blocks: [
    {
      start_time: '2026-03-05T09:00:00.000Z',
      end_time: '2026-03-05T12:30:00.000Z',
    },
  ],
};

describe('createStudioShiftSchema', () => {
  it('accepts a valid minimal payload', () => {
    const result = createStudioShiftSchema.safeParse(baseCreatePayload);
    expect(result.success).toBe(true);
  });

  // Regression for PR #72 review: dropping `calculated_cost` from the input shape
  // without `.strict()` would silently strip the field on legacy clients, masking
  // a wire-breaking change. Strict mode forces a clear migration error instead.
  it('rejects the now-removed calculated_cost field with a clear error', () => {
    const result = createStudioShiftSchema.safeParse({
      ...baseCreatePayload,
      calculated_cost: 123.45,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(JSON.stringify(result.error.issues)).toContain('calculated_cost');
  });

  it('rejects any other unknown top-level key', () => {
    const result = createStudioShiftSchema.safeParse({
      ...baseCreatePayload,
      projected_cost: 100,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(JSON.stringify(result.error.issues)).toContain('projected_cost');
  });
});

describe('updateStudioShiftSchema', () => {
  it('accepts a valid partial update payload', () => {
    const result = updateStudioShiftSchema.safeParse({
      hourly_rate: 25,
      override_reason: 'manager re-rated for overtime',
    });
    expect(result.success).toBe(true);
  });

  // Same rationale as createStudioShiftSchema: must fail fast on legacy keys.
  it('rejects the now-removed calculated_cost field with a clear error', () => {
    const result = updateStudioShiftSchema.safeParse({
      calculated_cost: 123.45,
      override_reason: 'tried to override',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(JSON.stringify(result.error.issues)).toContain('calculated_cost');
  });
});
