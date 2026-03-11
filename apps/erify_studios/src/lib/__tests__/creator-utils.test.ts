import { describe, expect, it } from 'vitest';

import { getCreatorCollection, getCreatorId, getCreatorName, getCreatorNames, getCreatorNameSummary } from '../creator-utils';

describe('creator-utils', () => {
  it('resolves creator id and creator name fields', () => {
    const creator = {
      id: 'internal-id',
      creator_id: 'creator_01',
      creator_name: 'Creator Name',
    };

    expect(getCreatorId(creator)).toBe('creator_01');
    expect(getCreatorName(creator)).toBe('Creator Name');
  });

  it('uses creators collection only', () => {
    const source = {
      creators: [
        { creator_id: 'creator_01', creator_name: 'Creator One' },
        { id: 'fallback-id', name: 'Fallback Name' },
      ],
    };

    expect(getCreatorCollection(source)).toHaveLength(2);
    expect(getCreatorNames(source)).toEqual(['Creator One', 'Fallback Name']);
  });

  it('returns empty list when creators collection is absent', () => {
    expect(getCreatorCollection({})).toEqual([]);
    expect(getCreatorNames({})).toEqual([]);
  });

  it('returns creator_names summary only', () => {
    expect(getCreatorNameSummary({
      creator_names: ['Creator A', 'Creator B'],
    })).toEqual(['Creator A', 'Creator B']);
  });
});
