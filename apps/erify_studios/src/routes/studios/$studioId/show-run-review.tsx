import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

import { Button } from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { ShowRunReviewScopeCard } from '@/features/show-run-review/components/show-run-review-scope-card';
import { ShowRunSummary } from '@/features/show-run-review/components/show-run-summary';
import {
  type ShowRunReviewSearch,
  showRunReviewSearchSchema,
} from '@/features/show-run-review/config/show-run-review-search-schema';
import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';
import {
  buildShowRunReviewDateRange,
  isCurrentShowRunReviewDay,
} from '@/features/show-run-review/lib/show-run-review-date-range';
import { useShowRunReviewSummaryQuery } from '@/features/shows/api/get-show-run-review-summary';

export const Route = createFileRoute('/studios/$studioId/show-run-review')({
  component: ShowRunReviewPage,
  validateSearch: (search) => showRunReviewSearchSchema.parse(search),
});

function ShowRunReviewPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const updateSearch = useCallback((nextSearch: Partial<ShowRunReviewSearch>) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...nextSearch,
      }),
      replace: true,
    });
  }, [navigate]);

  const handleResetDateRange = useCallback(() => {
    updateSearch({ date_from: undefined, date_to: undefined });
  }, [updateSearch]);

  const dateRange = useMemo(
    () => buildShowRunReviewDateRange(search),
    [search],
  );

  const { data, isLoading, isFetching, isError, error } = useShowRunReviewSummaryQuery(
    studioId,
    {
      date_from: dateRange.windowStart.toISOString(),
      date_to: dateRange.windowEnd.toISOString(),
    },
    isCurrentShowRunReviewDay(dateRange),
  );

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="showRunReview"
      deniedTitle="Show Run Review Access Required"
      deniedDescription="Only studio managers and admins can access show run review."
    >
      <PageLayout
        title="Show Run Review"
        description="Review submitted show results and export filtered operational rows for the selected range."
      >
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
            <ShowRunReviewScopeCard search={search} onSearchChange={updateSearch} />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDateRange}
              >
                Today
              </Button>
            </div>
          </div>

          {isLoading
            ? (
                <div className="space-y-6 animate-pulse">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 rounded-xl border bg-muted/20" />
                    ))}
                  </div>
                  <div className="h-64 rounded-xl border bg-muted/10" />
                </div>
              )
            : data
              ? (
                  <ShowRunSummary
                    data={data}
                    isFetching={isFetching}
                    search={search}
                    onSearchChange={updateSearch}
                    studioId={studioId}
                  />
                )
              : isError
                ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive text-sm">
                      {getShowRunReviewErrorMessage(error)}
                    </div>
                  )
                : (
                    <div className="rounded-lg border bg-background p-6 text-center text-muted-foreground text-sm">
                      No show run review data for the selected range.
                    </div>
                  )}
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
