import {
  updateStudioCreatorRosterInputSchema,
} from '@eridu/api-types/studio-creators';

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
});
