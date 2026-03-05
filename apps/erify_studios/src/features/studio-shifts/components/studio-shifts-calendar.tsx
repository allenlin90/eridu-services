import {
  type CalendarEvent,
  viewDay,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { useNextCalendarApp } from '@schedule-x/react';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@eridu/ui';

import '@schedule-x/theme-default/dist/index.css';

import { ShiftCalendarCard } from '@/features/studio-shifts/components/shift-calendar-card';
import { useStudioMemberMap } from '@/features/studio-shifts/hooks/use-studio-member-map';
import { useMyShifts, useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { toScheduleXDateTime } from '@/features/studio-shifts/utils/schedule-x.utils';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import { formatDate } from '@/features/studio-shifts/utils/shift-form.utils';

export type StudioShiftsCalendarProps = {
  studioId: string;
  summaryText?: string;
  queryScope?: 'studio' | 'me';
};

export function StudioShiftsCalendar({
  studioId,
  summaryText = 'Read-only view of studio shifts. Switch to Table view to manage, create, and filter shifts.',
  queryScope = 'studio',
}: StudioShiftsCalendarProps) {
  const [dateRange, setDateRange] = useState<{ date_from: string; date_to: string } | null>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 1);
    const end = new Date(today);
    end.setDate(today.getDate() + 8);

    const toDateString = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      date_from: toDateString(start),
      date_to: toDateString(end),
    };
  });

  const extractDateString = (value: unknown): string | null => {
    const raw = String(value);
    const match = raw.match(/\d{4}-\d{2}-\d{2}/);
    return match?.[0] ?? null;
  };

  const { memberMap } = useStudioMemberMap(studioId, { limit: 500 });

  const calendarRangeLimit = useMemo(() => {
    if (!dateRange) {
      return 150;
    }

    const start = new Date(`${dateRange.date_from}T00:00:00`);
    const end = new Date(`${dateRange.date_to}T23:59:59`);
    const daySpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    return Math.min(600, Math.max(60, daySpan * 12));
  }, [dateRange]);

  const queryParams = useMemo(() => {
    return {
      limit: calendarRangeLimit,
      page: 1,
      ...(queryScope === 'me' ? { studio_id: studioId } : {}),
      ...(dateRange ? { date_from: dateRange.date_from, date_to: dateRange.date_to } : {}),
    } as const;
  }, [calendarRangeLimit, dateRange, queryScope, studioId]);

  const studioShiftsQuery = useStudioShifts(studioId, queryParams, { enabled: queryScope === 'studio' });
  const myShiftsQuery = useMyShifts(queryParams, { enabled: queryScope === 'me' });

  const calendarShiftsResponse = queryScope === 'me' ? myShiftsQuery.data : studioShiftsQuery.data;
  const isLoadingCalendarShifts = queryScope === 'me' ? myShiftsQuery.isLoading : studioShiftsQuery.isLoading;
  const isFetchingCalendarShifts = queryScope === 'me' ? myShiftsQuery.isFetching : studioShiftsQuery.isFetching;
  const refetch = queryScope === 'me' ? myShiftsQuery.refetch : studioShiftsQuery.refetch;

  const calendarShifts = useMemo(() => {
    const rows = calendarShiftsResponse?.data ?? [];
    return [...rows].sort((a, b) => {
      const sortedBlocksA = sortShiftBlocksByStart(a.blocks);
      const sortedBlocksB = sortShiftBlocksByStart(b.blocks);
      const timeA = sortedBlocksA[0] ? new Date(sortedBlocksA[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = sortedBlocksB[0] ? new Date(sortedBlocksB[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [calendarShiftsResponse?.data]);

  const calendarEvents = useMemo(() => {
    return calendarShifts.flatMap((shift) => {
      const user = memberMap.get(shift.user_id);
      const memberName = user?.name ?? shift.user_id;
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
  }, [calendarShifts, memberMap]);

  const calendarApp = useNextCalendarApp({
    views: [viewMonthGrid, viewWeek, viewDay],
    defaultView: viewWeek.name,
    events: calendarEvents as unknown as CalendarEvent[],
    calendars: {
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
    },
    callbacks: {
      onRangeUpdate(range) {
        const startRaw = extractDateString(range.start);
        const endRaw = extractDateString(range.end);

        if (!startRaw || !endRaw) {
          return;
        }

        setDateRange({
          date_from: startRaw,
          date_to: endRaw,
        });
      },
    },
  });

  return (
    <div className="grid gap-4 mt-2">
      <div className="flex justify-between items-center bg-muted/20 border rounded-lg px-3 py-2">
        <p className="text-sm text-muted-foreground mr-auto">
          {summaryText}
        </p>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetchingCalendarShifts}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingCalendarShifts ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ShiftCalendarCard
        isLoading={isLoadingCalendarShifts}
        isFetching={isFetchingCalendarShifts}
        shiftCount={calendarEvents.length}
        calendarApp={calendarApp}
        dateRange={dateRange}
      />
    </div>
  );
}
