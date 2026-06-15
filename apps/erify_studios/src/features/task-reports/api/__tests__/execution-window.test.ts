import { describe, expect, it } from 'vitest';

import type { TaskReportScope } from '@eridu/api-types/task-management';

import { buildOperationalDayRange } from '@/lib/operational-day-range';

import { withExecutionWindow } from '../execution-window';

describe('withExecutionWindow', () => {
  it('attaches the operational-day window as ISO instants and preserves the calendar scope', () => {
    const scope = {
      date_from: '2026-03-10',
      date_to: '2026-03-11',
      submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as TaskReportScope;

    const { windowStart, windowEnd } = buildOperationalDayRange({
      date_from: '2026-03-10',
      date_to: '2026-03-11',
    });

    const result = withExecutionWindow(scope);

    // Window is the client-resolved operational-day range, serialized to ISO (UTC) instants.
    expect(result.window_start).toBe(windowStart.toISOString());
    expect(result.window_end).toBe(windowEnd.toISOString());
    expect(result.window_start.endsWith('Z')).toBe(true);
    expect(result.window_end.endsWith('Z')).toBe(true);

    // Calendar dates and other scope fields are passed through untouched.
    expect(result.date_from).toBe('2026-03-10');
    expect(result.date_to).toBe('2026-03-11');
    expect(result.submitted_statuses).toEqual(['REVIEW', 'COMPLETED', 'CLOSED']);
  });
});
