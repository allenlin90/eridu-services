import {
  type CalendarEvent,
  viewDay,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { useNextCalendarApp } from '@schedule-x/react';
import { useCallback, useMemo, useState } from 'react';

import '@schedule-x/theme-default/dist/index.css';

import { ShiftCalendarCard } from '@/features/studio-shifts/components/shift-calendar-card';
import { STUDIO_MEMBER_MAP_CALENDAR_LIMIT } from '@/features/studio-shifts/constants/studio-shifts.constants';
import { useStudioMemberMap } from '@/features/studio-shifts/hooks/use-studio-member-map';
import { useMyShifts, useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { toScheduleXDateTime } from '@/features/studio-shifts/utils/schedule-x.utils';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import {
  createDefaultShiftCalendarRange,
  extractDateStringFromUnknown,
  getShiftCalendarRangeLimit,
} from '@/features/studio-shifts/utils/shift-calendar-range.utils';
import { formatDate } from '@/features/studio-shifts/utils/shift-form.utils';
import { sortShiftsByFirstBlockStart } from '@/features/studio-shifts/utils/shift-timeline.utils';
import { useAppDebounce } from '@/lib/hooks/use-app-debounce';

export type StudioShiftsCalendarProps = {
  studioId: string;
  summaryText?: string;
  queryScope?: 'studio' | 'me';
};

const CALENDAR_VIEWS = [viewMonthGrid, viewWeek, viewDay];
const CALENDAR_CONFIG = {
  'shift': {
    colorName: 'shift',
    lightColors: {
      main: '#1d4ed8',
      container: '#dbeafe',
      onContainer: '#1e3a8a',
    },
  },
  'duty-manager': {
    colorName: 'duty',
    lightColors: {
      main: '#b45309',
      container: '#fef3c7',
      onContainer: '#78350f',
    },
  },
} as const;

export function StudioShiftsCalendar({
  studioId,
  summaryText,
  queryScope = 'studio',
}: StudioShiftsCalendarProps) {
  const [dateRange, setDateRange] = useState<{ date_from: string; date_to: string } | null>(
    () => createDefaultShiftCalendarRange(),
  );
  const debouncedDateRange = useAppDebounce(dateRange, { delay: 300 });

  const { memberMap } = useStudioMemberMap(studioId, {
    enabled: queryScope === 'studio',
    limit: STUDIO_MEMBER_MAP_CALENDAR_LIMIT,
  });

  const calendarRangeLimit = getShiftCalendarRangeLimit(debouncedDateRange);

  const queryParams = useMemo(() => {
    return {
      limit: calendarRangeLimit,
      page: 1,
      ...(queryScope === 'me' ? { studio_id: studioId } : {}),
      ...(debouncedDateRange ? { date_from: debouncedDateRange.date_from, date_to: debouncedDateRange.date_to } : {}),
    } as const;
  }, [calendarRangeLimit, debouncedDateRange, queryScope, studioId]);

  const studioShiftsQuery = useStudioShifts(studioId, queryParams, { enabled: queryScope === 'studio' });
  const myShiftsQuery = useMyShifts(queryParams, { enabled: queryScope === 'me' });

  const calendarShiftsResponse = queryScope === 'me' ? myShiftsQuery.data : studioShiftsQuery.data;
  const isLoadingCalendarShifts = queryScope === 'me' ? myShiftsQuery.isLoading : studioShiftsQuery.isLoading;
  const isFetchingCalendarShifts = queryScope === 'me' ? myShiftsQuery.isFetching : studioShiftsQuery.isFetching;
  const refetch = queryScope === 'me' ? myShiftsQuery.refetch : studioShiftsQuery.refetch;

  const calendarShifts = useMemo(() => {
    const rows = calendarShiftsResponse?.data ?? [];
    return sortShiftsByFirstBlockStart(rows);
  }, [calendarShiftsResponse?.data]);

  const calendarEvents = useMemo(() => {
    return calendarShifts.flatMap((shift) => {
      const user = memberMap.get(shift.user_id);
      const memberName = queryScope === 'me' ? 'Me' : (user?.name ?? shift.user_id);
      const sortedBlocks = sortShiftBlocksByStart(shift.blocks);
      if (sortedBlocks.length === 0) {
        return [];
      }

      return sortedBlocks.map((block, blockIndex) => ({
        id: `${shift.id}-${block.id}`,
        title: shift.is_duty_manager ? `Duty: ${memberName}` : memberName,
        start: toScheduleXDateTime(block.start_time),
        end: toScheduleXDateTime(block.end_time),
        calendarId: shift.is_duty_manager ? 'duty-manager' : 'shift',
        description: `${formatDate(block.start_time)} | ${shift.status} | Block ${blockIndex + 1}/${sortedBlocks.length}`,
      }));
    });
  }, [calendarShifts, memberMap, queryScope]);

  const handleCalendarRangeUpdate = useCallback((range: { start: unknown; end: unknown }) => {
    const startRaw = extractDateStringFromUnknown(range.start);
    const endRaw = extractDateStringFromUnknown(range.end);

    if (!startRaw || !endRaw) {
      return;
    }

    setDateRange((previous) => {
      if (previous?.date_from === startRaw && previous?.date_to === endRaw) {
        return previous;
      }

      return {
        date_from: startRaw,
        date_to: endRaw,
      };
    });
  }, []);

  const calendarApp = useNextCalendarApp({
    views: CALENDAR_VIEWS,
    defaultView: viewWeek.name,
    events: calendarEvents as unknown as CalendarEvent[],
    calendars: CALENDAR_CONFIG,
    callbacks: {
      onRangeUpdate: handleCalendarRangeUpdate,
    },
  });

  return (
    <div className="grid gap-4">
      {summaryText && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2 lg:flex-row lg:items-center">
          <p className="mr-auto text-sm text-muted-foreground">
            {summaryText}
          </p>
        </div>
      )}

      <ShiftCalendarCard
        isLoading={isLoadingCalendarShifts}
        isFetching={isFetchingCalendarShifts}
        shiftCount={calendarEvents.length}
        calendarApp={calendarApp}
        dateRange={dateRange}
        onRefresh={() => void refetch()}
      />
    </div>
  );
}
