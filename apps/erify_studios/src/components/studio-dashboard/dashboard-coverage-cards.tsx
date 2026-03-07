import { AlertTriangle, CheckCircle2, UserCheck, UserMinus } from 'lucide-react';
import { memo, useMemo } from 'react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import {
  DASHBOARD_DUTY_SHIFTS_LIMIT,
} from '@/features/studio-shifts/constants/studio-shifts.constants';
import {
  useDutyManager,
  useStudioShifts,
} from '@/features/studio-shifts/hooks/use-studio-shifts';
import { formatDate, getShiftWindowLabel } from '@/features/studio-shifts/utils/shift-form.utils';
import { getShiftFirstBlockStartMs, sortShiftsByFirstBlockStart } from '@/features/studio-shifts/utils/shift-timeline.utils';

type DashboardDutyCoverageCardsProps = {
  studioId: string;
  selectedDate: string;
  previewUntil: string;
  isSelectedToday: boolean;
  dutyReferenceTime?: string;
};

export const DashboardDutyCoverageCards = memo(({
  studioId,
  selectedDate,
  previewUntil,
  isSelectedToday,
  dutyReferenceTime,
}: DashboardDutyCoverageCardsProps) => {
  const { data: dutyManager, isLoading: isLoadingDutyManager } = useDutyManager(studioId, dutyReferenceTime);
  const {
    data: dutyShiftResponse,
    isLoading: isLoadingDutyShifts,
    isFetching: isFetchingDutyShifts,
  } = useStudioShifts(studioId, {
    page: 1,
    limit: DASHBOARD_DUTY_SHIFTS_LIMIT,
    date_from: selectedDate,
    date_to: previewUntil,
    is_duty_manager: true,
    status: 'SCHEDULED',
  });
  const activeShiftStartMs = useMemo(
    () => (dutyManager ? getShiftFirstBlockStartMs(dutyManager) : null),
    [dutyManager],
  );
  const upcomingDutyManagerShifts = useMemo(() => {
    return sortShiftsByFirstBlockStart(dutyShiftResponse?.data ?? [])
      .filter((shift) => {
        if (shift.status !== 'SCHEDULED') {
          return false;
        }
        const shiftStartMs = getShiftFirstBlockStartMs(shift);
        if (shiftStartMs === null) {
          return false;
        }
        if (shift.id === dutyManager?.id) {
          return false;
        }
        if (activeShiftStartMs === null) {
          return true;
        }
        return shiftStartMs > activeShiftStartMs;
      });
  }, [activeShiftStartMs, dutyManager?.id, dutyShiftResponse?.data]);
  const nextDutyShift = upcomingDutyManagerShifts[0];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Active Duty Manager
          </CardTitle>
          <CardDescription>
            {isSelectedToday
              ? 'Current on-shift owner for this studio.'
              : 'Duty manager at the start of this operational day.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDutyManager
            ? (
                <p className="text-sm text-muted-foreground">Loading active duty manager...</p>
              )
            : dutyManager
              ? (
                  <div className="space-y-1">
                    <p className="font-medium">{dutyManager.user_name}</p>
                    <p className="text-sm text-muted-foreground">{getShiftWindowLabel(dutyManager)}</p>
                    <Badge className="mt-1">On Duty</Badge>
                  </div>
                )
              : (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    <p className="inline-flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      No active duty manager right now
                    </p>
                    <p className="mt-1 text-xs">
                      Please check shift assignments to ensure duty coverage.
                    </p>
                  </div>
                )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Duty Manager</CardTitle>
          <CardDescription>
            Next upcoming duty assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(isLoadingDutyShifts || isFetchingDutyShifts)
            ? (
                <p className="text-sm text-muted-foreground">Loading upcoming shifts...</p>
              )
            : nextDutyShift
              ? (
                  <>
                    <p className="font-medium">{nextDutyShift.user_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(nextDutyShift.date)}
                      {' '}
                      |
                      {' '}
                      {getShiftWindowLabel(nextDutyShift)}
                    </p>
                  </>
                )
              : (
                  <p className="text-sm text-muted-foreground">No upcoming duty manager shift in the next 7 days from this day.</p>
                )}
        </CardContent>
      </Card>
    </>
  );
});

export function TaskSummaryInline({
  completed,
  total,
  assigned,
  unassigned,
}: {
  completed: number;
  total: number;
  assigned: number;
  unassigned: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        {completed}
        /
        {total}
      </span>
      <span className="inline-flex items-center gap-1 text-blue-700">
        <UserCheck className="h-4 w-4" />
        {assigned}
      </span>
      <span className="inline-flex items-center gap-1 text-amber-700">
        <UserMinus className="h-4 w-4" />
        {unassigned}
      </span>
    </div>
  );
}
