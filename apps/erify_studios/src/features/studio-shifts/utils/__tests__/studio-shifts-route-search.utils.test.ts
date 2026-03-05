import { describe, expect, it } from 'vitest';

import {
  toCalendarViewSearch,
  toTableViewSearch,
} from '../studio-shifts-route-search.utils';

describe('studioShiftsRouteSearchUtils', () => {
  it('should reset to canonical calendar search state', () => {
    expect(toCalendarViewSearch()).toEqual({
      view: 'calendar',
      page: 1,
      limit: 20,
    });
  });

  it('should preserve table filters when switching from calendar/table state', () => {
    const previous = {
      view: 'calendar' as const,
      page: 3,
      limit: 50,
      user_id: 'user_1',
      status: 'SCHEDULED' as const,
      duty: 'true' as const,
      date_from: '2026-03-01',
      date_to: '2026-03-07',
    };

    expect(toTableViewSearch(previous)).toEqual({
      ...previous,
      view: 'table',
    });
  });
});
