import {
  onboardCreatorInputSchema,
  studioCreatorOnboardingUserSearchQuerySchema,
} from '@eridu/api-types/studio-creators';

describe('onboardCreatorInputSchema', () => {
  it('accepts valid onboarding payloads', () => {
    const result = onboardCreatorInputSchema.safeParse({
      creator: {
        name: 'Alice Example',
        alias_name: 'Alice',
        user_id: 'user_00000000000000000001',
        metadata: {},
      },
      roster: {
        default_rate: 500,
        default_rate_type: 'FIXED',
        default_commission_rate: null,
        metadata: {},
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid fixed compensation combinations', () => {
    const result = onboardCreatorInputSchema.safeParse({
      creator: {
        name: 'Alice Example',
        alias_name: 'Alice',
      },
      roster: {
        default_rate_type: 'FIXED',
        default_commission_rate: 10,
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('studioCreatorOnboardingUserSearchQuerySchema', () => {
  it('defaults limit to 20', () => {
    const result = studioCreatorOnboardingUserSearchQuerySchema.parse({
      search: 'alice',
    });

    expect(result.limit).toBe(20);
  });

  it('enforces max limit of 50', () => {
    const result = studioCreatorOnboardingUserSearchQuerySchema.safeParse({
      search: 'alice',
      limit: 51,
    });

    expect(result.success).toBe(false);
  });
});
