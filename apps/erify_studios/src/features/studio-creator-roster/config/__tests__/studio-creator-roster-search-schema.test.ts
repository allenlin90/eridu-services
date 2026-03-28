import { describe, expect, it } from 'vitest';

import { studioCreatorRosterSearchSchema } from '../studio-creator-roster-search-schema';

describe('studioCreatorRosterSearchSchema', () => {
  it('defaults the roster view to active creators', () => {
    expect(studioCreatorRosterSearchSchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      is_active: 'true',
      default_rate_type: undefined,
    });
  });
});
