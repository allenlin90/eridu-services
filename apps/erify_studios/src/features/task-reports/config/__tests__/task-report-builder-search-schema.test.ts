import { describe, expect, it } from 'vitest';

import { parseTaskReportBuilderSearch } from '../task-report-builder-search-schema';

describe('parseTaskReportBuilderSearch', () => {
  it('returns an empty search object when the route has no query params', () => {
    expect(parseTaskReportBuilderSearch(undefined)).toEqual({
      definition_id: undefined,
    });
  });

  it('preserves the definition id when provided', () => {
    expect(parseTaskReportBuilderSearch({
      definition_id: 'trdef_00000000000000000001',
    })).toEqual({
      definition_id: 'trdef_00000000000000000001',
    });
  });
});
