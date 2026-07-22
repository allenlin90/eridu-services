import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { operationalWindowToDayRange } from '@/lib/operational-day-range';
import * as m from '@/paraglide/messages';

function parseSearchParamDate(value: string | undefined, isEnd = false): Date | undefined {
  if (!value)
    return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = fromLocalDateInput(value);
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }
  return new Date(value);
}

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);

    const requestedFrom = parsed.show_start_from ?? parsed.due_date_from;
    const requestedTo = parsed.show_start_to ?? parsed.due_date_to;

    // Default to the current operational show-day only when both boundaries are missing.
    if (!requestedFrom && !requestedTo) {
      const defaultRange = operationalWindowToDayRange(undefined);
      return {
        ...parsed,
        due_date_from: undefined,
        due_date_to: undefined,
        show_start_from: defaultRange.windowStart.toISOString(),
        show_start_to: defaultRange.windowEnd.toISOString(),
      };
    }

    const fromDate = parseSearchParamDate(requestedFrom, false);
    const toDate = parseSearchParamDate(requestedTo, true);

    // Normalize each boundary against its own window-edge semantics so already-
    // normalized ISO timestamps (e.g. windowEnd at 05:59:59) don't drift forward.
    const normalizedFrom = fromDate
      ? operationalWindowToDayRange({ from: fromDate }).windowStart.toISOString()
      : undefined;
    const normalizedTo = toDate
      ? operationalWindowToDayRange({ to: toDate }).windowEnd.toISOString()
      : undefined;

    return {
      ...parsed,
      due_date_from: undefined,
      due_date_to: undefined,
      show_start_from: normalizedFrom,
      show_start_to: normalizedTo,
    };
  },
});

function StudioTaskReviewLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="reviewQueue"
      deniedTitle={m.task_review_qc_access_title()}
      deniedDescription={m.task_review_qc_access_description()}
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
