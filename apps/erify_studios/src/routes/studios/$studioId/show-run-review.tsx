import { createFileRoute } from '@tanstack/react-router';
import { BadgeCheck, CalendarCheck2, MonitorCheck, UserCheck2 } from 'lucide-react';
import { useCallback } from 'react';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { ShowRunReviewPreview } from '@/features/show-run-review/components/show-run-review-preview';
import { ShowRunReviewScopeCard } from '@/features/show-run-review/components/show-run-review-scope-card';
import type { ShowRunReviewSearch } from '@/features/show-run-review/lib/show-run-review-date-range';

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
          <ShowRunReviewPreview
            title="Run Checklist"
            description="Use this after task submissions are signed off and operational facts are populated to show records."
            metrics={[
              {
                label: 'Shows',
                value: '-',
                detail: 'Submitted and signed-off runs with actual start and end times',
              },
              {
                label: 'Creators',
                value: '-',
                detail: 'Late or missing attendance reasons to review',
                tone: 'warning',
              },
              {
                label: 'Platforms',
                value: '-',
                detail: 'Active issues reported for platform streams',
                tone: 'warning',
              },
              {
                label: 'Ready',
                value: '-',
                detail: 'Operational days ready for manager sign-off',
                tone: 'success',
              },
            ]}
            steps={[
              {
                title: 'Shows happened',
                description: 'Confirm each signed-off show has the actual start and end times needed for review.',
                icon: <CalendarCheck2 className="h-4 w-4 text-blue-600" />,
              },
              {
                title: 'Creators showed up',
                description: 'Review late arrivals, missing creators, and manager-approved reason notes.',
                icon: <UserCheck2 className="h-4 w-4 text-emerald-600" />,
              },
              {
                title: 'Streams stayed clean',
                description: 'Check active platform issues before the range is signed off.',
                icon: <MonitorCheck className="h-4 w-4 text-slate-700" />,
              },
              {
                title: 'Range is ready',
                description: 'Surface unresolved items before a manager signs off the selected range.',
                icon: <BadgeCheck className="h-4 w-4 text-emerald-600" />,
              },
            ]}
          />
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
