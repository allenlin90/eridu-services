import { endOfDay, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';

import {
  buildSchedulePublishImpactsQueryParams,
  hasActiveImpactFilters,
  schedulePublishImpactsSearchSchema,
  searchForTabSwitch,
} from '../schedule-publish-impacts-search-schema';

describe('schedulePublishImpactsSearchSchema', () => {
  it('defaults to the impacts tab and drops invalid values instead of throwing', () => {
    const parsed = schedulePublishImpactsSearchSchema.parse({
      tab: 'bogus',
      page: 'NaN-ish',
      page_size: 33,
      impact_kind: ['not_a_kind'],
    });

    expect(parsed.tab).toBe('impacts');
    expect(parsed.page).toBeUndefined();
    expect(parsed.page_size).toBeUndefined();
    expect(parsed.impact_kind).toBeUndefined();
  });

  it('keeps valid filter values', () => {
    const parsed = schedulePublishImpactsSearchSchema.parse({
      tab: 'runs',
      runs_page: '2',
      impact_kind: ['past_show_creator_backfilled'],
      resolution_status: ['pending'],
      publish_run_id: 'prun_abc',
    });

    expect(parsed.tab).toBe('runs');
    expect(parsed.runs_page).toBe(2);
    expect(parsed.impact_kind).toEqual(['past_show_creator_backfilled']);
    expect(parsed.resolution_status).toEqual(['pending']);
    expect(parsed.publish_run_id).toBe('prun_abc');
  });

  // Regression: URL-editable date params used to accept any string, and
  // `dayStartIso`/`dayEndIso` then threw a RangeError that crashed the route.
  it.each(['not-a-date', '2026-7-1', '2026-02-31', '01-07-2026', '2026-02-28T10:00'])(
    'discards the malformed calendar-day value %s instead of crashing later conversion',
    (value) => {
      const parsed = schedulePublishImpactsSearchSchema.parse({
        start_from: value,
        start_to: value,
        changed_from: value,
        changed_to: value,
      });

      expect(parsed.start_from).toBeUndefined();
      expect(parsed.start_to).toBeUndefined();
      expect(parsed.changed_from).toBeUndefined();
      expect(parsed.changed_to).toBeUndefined();
      expect(() => buildSchedulePublishImpactsQueryParams(parsed)).not.toThrow();
    },
  );

  it('keeps well-formed calendar-day values', () => {
    const parsed = schedulePublishImpactsSearchSchema.parse({
      start_from: '2026-07-01',
      changed_to: '2026-07-15',
    });

    expect(parsed.start_from).toBe('2026-07-01');
    expect(parsed.changed_to).toBe('2026-07-15');
  });
});

describe('buildSchedulePublishImpactsQueryParams', () => {
  it('applies pagination defaults and omits absent filters', () => {
    expect(buildSchedulePublishImpactsQueryParams({ tab: 'impacts' })).toEqual({
      page: 1,
      limit: 25,
    });
  });

  it('wires every filter into the API params', () => {
    const params = buildSchedulePublishImpactsQueryParams({
      tab: 'impacts',
      page: 3,
      page_size: 50,
      start_from: '2026-07-01',
      start_to: '2026-07-05',
      changed_from: '2026-07-10',
      changed_to: '2026-07-12',
      impact_kind: ['confirmed_future_updated', 'past_show_creator_backfilled'],
      resolution_status: ['pending'],
      publish_run_id: 'prun_abc',
    });

    expect(params).toEqual({
      page: 3,
      limit: 50,
      start_date_from: startOfDay(new Date('2026-07-01T00:00:00')).toISOString(),
      start_date_to: endOfDay(new Date('2026-07-05T00:00:00')).toISOString(),
      changed_from: startOfDay(new Date('2026-07-10T00:00:00')).toISOString(),
      changed_to: endOfDay(new Date('2026-07-12T00:00:00')).toISOString(),
      impact_kind: ['confirmed_future_updated', 'past_show_creator_backfilled'],
      resolution_status: ['pending'],
      publish_run_id: 'prun_abc',
    });
  });

  it('omits empty filter arrays', () => {
    const params = buildSchedulePublishImpactsQueryParams({
      tab: 'impacts',
      impact_kind: [],
      resolution_status: [],
    });

    expect(params.impact_kind).toBeUndefined();
    expect(params.resolution_status).toBeUndefined();
  });
});

describe('searchForTabSwitch', () => {
  it('resets the impacts tab filters when switching to runs', () => {
    expect(searchForTabSwitch('runs')).toEqual({ tab: 'runs', runs_page: 1 });
  });

  it('resets the runs tab params when switching back to impacts', () => {
    expect(searchForTabSwitch('impacts')).toEqual({ tab: 'impacts', page: 1 });
  });
});

describe('hasActiveImpactFilters', () => {
  it('is false for the untouched default view', () => {
    expect(hasActiveImpactFilters({ tab: 'impacts', page: 2, page_size: 50 })).toBe(false);
  });

  it('is true when any filter is set', () => {
    expect(hasActiveImpactFilters({ tab: 'impacts', publish_run_id: 'prun_abc' })).toBe(true);
    expect(hasActiveImpactFilters({ tab: 'impacts', impact_kind: ['stale_conflict'] })).toBe(true);
    expect(hasActiveImpactFilters({ tab: 'impacts', changed_from: '2026-07-01' })).toBe(true);
  });
});
