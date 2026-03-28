import { describe, expect, it } from 'vitest';

import { getStudioCreatorRosterColumns } from '../studio-creator-roster-columns';

describe('getStudioCreatorRosterColumns', () => {
  it('shows the actions column only for admins', () => {
    const adminColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      isAdmin: true,
    });
    const readOnlyColumns = getStudioCreatorRosterColumns({
      studioId: 'std_1',
      isAdmin: false,
    });

    expect(adminColumns.some((column) => column.id === 'actions')).toBe(true);
    expect(readOnlyColumns.some((column) => column.id === 'actions')).toBe(false);
  });
});
