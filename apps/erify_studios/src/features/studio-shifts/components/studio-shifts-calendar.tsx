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

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { ShiftCalendarCard } from '@/features/studio-shifts/components/shift-calendar-card';
import { useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { toScheduleXDateTime } from '@/features/studio-shifts/utils/schedule-x.utils';
import { formatDate } from '@/features/studio-shifts/utils/shift-form.utils';

export type StudioShiftsCalendarProps = {
  studioId: string;
};

export function StudioShiftsCalendar({ studioId }: StudioShiftsCalendarProps) {
  const [dateRange, setDateRange] = useState<{ date_from: string; date_to: string } | null>(null);

  const extractDateString = (value: unknown): string | null => {
    const raw = String(value);
    const match = raw.match(/\d{4}-\d{2}-\d{2}/);
    return match?.[0] ?? null;
  };

  const { data: displayMembersResponse } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 500 },
    { enabled: true },
  );

  const queryParams = useMemo(() => {
    return {
      limit: 1000,
      page: 1,
      ...(dateRange ? { date_from: dateRange.date_from, date_to: dateRange.date_to } : {}),
    } as const;
  }, [dateRange]);

  const {
    data: calendarShiftsResponse,
    isLoading: isLoadingCalendarShifts,
    isFetching: isFetchingCalendarShifts,
    refetch,
  } = useStudioShifts(studioId, queryParams, { enabled: true });

  const displayMembers = useMemo(() => displayMembersResponse?.data ?? [], [displayMembersResponse?.data]);
  const memberMap = useMemo(() => {
    return new Map(
      displayMembers.map((member) => [
        member.user.id,
        {
          name: member.user.name,
          email: member.user.email,
        },
      ]),
    );
  }, [displayMembers]);

  const calendarShifts = useMemo(() => {
    const rows = calendarShiftsResponse?.data ?? [];
    return [...rows].sort((a, b) => {
      const timeA = a.blocks[0] ? new Date(a.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.blocks[0] ? new Date(b.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [calendarShiftsResponse?.data]);

  const calendarEvents = useMemo(() => {
    return calendarShifts.flatMap((shift) => {
      const user = memberMap.get(shift.user_id);
      const memberName = user?.name ?? shift.user_id;
      const sortedBlocks = [...shift.blocks].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
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
          Read-only view of studio shifts. Switch to Table view to manage, create, and filter shifts.
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
      />
    </div>
  );
}
