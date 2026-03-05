import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { StudioShiftsTable } from '@/features/studio-shifts/components/studio-shifts-table';
import { useShiftAlignment, useShiftCalendar } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import {
  toCalendarViewSearch,
  toTableViewSearch,
} from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';
import { useUserProfile } from '@/lib/hooks/use-user';

const shiftsSearchSchema = z.object({
  view: z.enum(['calendar', 'table']).catch('calendar'),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(20),
  user_id: z.string().optional().catch(undefined),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional().catch(undefined),
  duty: z.enum(['true', 'false']).optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shifts')({
  validateSearch: (search) => shiftsSearchSchema.parse(search),
  component: StudioShiftsPage,
});

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function fromLocalDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year || date.getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveDateParamOrDefault(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();
  const today = toLocalDateInputValue(new Date());
  const planningDateFrom = resolveDateParamOrDefault(search.date_from, today);
  const planningDateTo = resolveDateParamOrDefault(
    search.date_to,
    toLocalDateInputValue(addDays(fromLocalDateInput(planningDateFrom), 7)),
  );

  const viewMode = search.view;

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const isStudioAdmin = activeMembership?.role === STUDIO_ROLE.ADMIN;
  const orchestrationQueryParams = {
    date_from: planningDateFrom,
    date_to: planningDateTo,
    include_cancelled: false,
  };
  const {
    data: shiftCalendarResponse,
    isLoading: isLoadingShiftCalendar,
    isFetching: isFetchingShiftCalendar,
    refetch: refetchShiftCalendar,
  } = useShiftCalendar(studioId, orchestrationQueryParams, { enabled: isStudioAdmin });
  const {
    data: shiftAlignmentResponse,
    isLoading: isLoadingShiftAlignment,
    isFetching: isFetchingShiftAlignment,
    refetch: refetchShiftAlignment,
  } = useShiftAlignment(studioId, orchestrationQueryParams, { enabled: isStudioAdmin });
  const shiftCoverageWarningCount = shiftAlignmentResponse?.summary.risk_show_count ?? 0;
  const hasShiftCoverageWarnings = shiftCoverageWarningCount > 0;

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/shifts',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  const handleToggleView = (mode: 'calendar' | 'table') => {
    updateSearch((prev) => {
      if (mode === 'calendar') {
        return toCalendarViewSearch();
      }
      return toTableViewSearch(prev);
    }, { replace: false });
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isStudioAdmin) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Shift Management Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only studio admins can access shift management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Studio Shift Schedule</h1>
          <p className="text-muted-foreground">
            Plan upcoming shifts and control future coverage risk.
          </p>
        </div>

        <div className="inline-flex rounded-md border bg-background p-1 shrink-0">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('calendar')}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('table')}
          >
            Table
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Planning Risk Warnings</CardTitle>
              <CardDescription>
                Planning window:
                {' '}
                {planningDateFrom}
                {' '}
                to
                {' '}
                {planningDateTo}
                {' '}
                (past shows skipped).
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => void refetchShiftAlignment()}
              disabled={isFetchingShiftAlignment}
              aria-label="Refresh planning risk warnings"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingShiftAlignment ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {(isLoadingShiftAlignment || isFetchingShiftAlignment)
              ? (
                  <p className="text-sm text-muted-foreground">Checking duty manager and task readiness risks...</p>
                )
              : (
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold">{shiftCoverageWarningCount}</p>
                    {hasShiftCoverageWarnings
                      ? (
                          <div className="space-y-1 text-sm text-amber-700">
                            <p>
                              {shiftAlignmentResponse?.summary.shows_without_duty_manager_count ?? 0}
                              {' '}
                              upcoming shows without duty manager coverage
                            </p>
                            <p>
                              {shiftAlignmentResponse?.summary.operational_days_without_duty_manager_count ?? 0}
                              {' '}
                              operational days (6am boundary) with duty manager gaps
                            </p>
                            <p>
                              {shiftAlignmentResponse?.summary.shows_without_tasks_count ?? 0}
                              {' '}
                              shows with no tasks,
                              {' '}
                              {shiftAlignmentResponse?.summary.shows_with_unassigned_tasks_count ?? 0}
                              {' '}
                              shows with unassigned tasks (
                              {shiftAlignmentResponse?.summary.tasks_unassigned_count ?? 0}
                              {' '}
                              tasks).
                            </p>
                            <p>
                              {shiftAlignmentResponse?.summary.shows_missing_required_tasks_count ?? 0}
                              {' '}
                              shows missing required
                              {' '}
                              SETUP/ACTIVE/CLOSURE tasks and
                              {' '}
                              {shiftAlignmentResponse?.summary.premium_shows_missing_moderation_count ?? 0}
                              {' '}
                              premium shows missing moderation tasks.
                            </p>
                          </div>
                        )
                      : (
                          <p className="text-sm text-emerald-700">
                            No duty manager or task-readiness risks for upcoming shows.
                          </p>
                        )}
                  </div>
                )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Shift Cost Snapshot</CardTitle>
              <CardDescription>
                Admin-only cost summary for upcoming shift planning.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => void refetchShiftCalendar()}
              disabled={isFetchingShiftCalendar}
              aria-label="Refresh shift cost snapshot"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingShiftCalendar ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {(isLoadingShiftCalendar || isFetchingShiftCalendar)
              ? (
                  <p className="text-sm text-muted-foreground">Aggregating shift costs...</p>
                )
              : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Projected:
                      {' '}
                      <span className="font-medium text-foreground">
                        $
                        {shiftCalendarResponse?.summary.total_projected_cost ?? '0.00'}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Calculated:
                      {' '}
                      <span className="font-medium text-foreground">
                        $
                        {shiftCalendarResponse?.summary.total_calculated_cost ?? '0.00'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shiftCalendarResponse?.summary.shift_count ?? 0}
                      {' '}
                      shifts ·
                      {' '}
                      {shiftCalendarResponse?.summary.total_hours ?? 0}
                      {' '}
                      hours
                    </p>
                  </div>
                )}
          </CardContent>
        </Card>
      </div>

      {viewMode === 'calendar'
        ? (
            <StudioShiftsCalendar studioId={studioId} />
          )
        : (
            <StudioShiftsTable
              studioId={studioId}
              isStudioAdmin={isStudioAdmin}
              search={search}
              updateSearch={updateSearch}
            />
          )}
    </div>
  );
}
