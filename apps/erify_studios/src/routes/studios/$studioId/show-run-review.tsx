import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { ShowRunReviewScopeCard } from '@/features/show-run-review/components/show-run-review-scope-card';
import { ShowRunSummary } from '@/features/show-run-review/components/show-run-summary';
import {
  buildShowRunReviewDateRange,
  type ShowRunReviewSearch,
} from '@/features/show-run-review/lib/show-run-review-date-range';
import { useShowRunReviewSummaryQuery } from '@/features/shows/api/get-show-run-review-summary';

const showRunReviewSearchSchema = z.object({
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/show-run-review')({
  component: ShowRunReviewPage,
  validateSearch: (search) => showRunReviewSearchSchema.parse(search),
});

function ShowRunReviewPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const updateSearch = useCallback((nextSearch: ShowRunReviewSearch) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...nextSearch,
      }),
      replace: true,
    });
  }, [navigate]);

  const dateRange = useMemo(
    () => buildShowRunReviewDateRange(search),
    [search],
  );

  const { data, isLoading, isFetching } = useShowRunReviewSummaryQuery(studioId, {
    date_from: dateRange.dateFrom,
    date_to: dateRange.dateTo,
  });

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="showRunReview"
      deniedTitle="Show Run Review Access Required"
      deniedDescription="Only studio managers and admins can access show run review."
    >
      <PageLayout
        title="Show Run Review"
        description="Review submitted and signed-off show results for the selected range."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ShowRunReviewScopeCard search={search} onSearchChange={updateSearch} />
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
                  <ShowRunSummary data={data} isFetching={isFetching} />
                )
              : (
                  <div className="rounded-lg border bg-background p-6 text-center text-muted-foreground text-sm">
                    Failed to load show run review summary.
                  </div>
                )}
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
