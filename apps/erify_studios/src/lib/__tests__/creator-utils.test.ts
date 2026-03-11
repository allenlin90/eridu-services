import { describe, expect, it } from 'vitest';

import { getCreatorCollection, getCreatorId, getCreatorName, getCreatorNames, getCreatorNameSummary } from '../creator-utils';

describe('creator-utils', () => {
  it('prefers creator fields for id and name', () => {
    const creator = {
      id: 'internal-id',
      creator_id: 'creator_01',
      mc_id: 'mc_legacy',
      creator_name: 'Creator Name',
      mc_name: 'Legacy MC Name',
    };

    expect(getCreatorId(creator)).toBe('creator_01');
    expect(getCreatorName(creator)).toBe('Creator Name');
  });

  it('falls back to legacy mcs collection when creators are absent', () => {
    const source = {
      mcs: [
        { mc_id: 'creator_legacy_01', mc_name: 'Legacy One' },
        { id: 'fallback-id', name: 'Fallback Name' },
      ],
    };

    expect(getCreatorCollection(source)).toHaveLength(2);
    expect(getCreatorNames(source)).toEqual(['Legacy One', 'Fallback Name']);
  });

  it('prefers creators collection over mcs when both exist', () => {
    const source = {
      creators: [{ creator_id: 'creator_01', creator_name: 'Primary Creator' }],
      mcs: [{ mc_id: 'mc_legacy', mc_name: 'Legacy Creator' }],
    };

    expect(getCreatorCollection(source)).toEqual(source.creators);
    expect(getCreatorNames(source)).toEqual(['Primary Creator']);
  });

  it('prefers creator_names summary and falls back to mc_names', () => {
    expect(getCreatorNameSummary({
      creator_names: ['Creator A', 'Creator B'],
      mc_names: ['Legacy A'],
    })).toEqual(['Creator A', 'Creator B']);

    expect(getCreatorNameSummary({
      creator_names: [],
      mc_names: ['Legacy A', 'Legacy B'],
    })).toEqual(['Legacy A', 'Legacy B']);
  });
});
