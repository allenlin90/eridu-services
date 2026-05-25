import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { BadgeCheck, CalendarCheck2, MonitorCheck, UserCheck2 } from 'lucide-react';
import { useCallback } from 'react';

import { PageLayout } from '@/components/layouts/page-layout';
import { OperationsReviewPreview } from '@/features/operations-review/components/operations-review-preview';
import {
  OperationsReviewScopeCard,
  type OperationsReviewSearch,
} from '@/features/operations-review/components/operations-review-scope-card';

const operationsReviewRouteApi = getRouteApi('/studios/$studioId/operations-review');

export const Route = createFileRoute('/studios/$studioId/operations-review/show-runs')({
  component: ShowRunReviewPage,
});

function ShowRunReviewPage() {
  const search = operationsReviewRouteApi.useSearch();
  const navigate = operationsReviewRouteApi.useNavigate();

  const updateSearch = useCallback((nextSearch: OperationsReviewSearch) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...nextSearch,
      }),
      replace: true,
    });
  }, [navigate]);

  return (
    <PageLayout
      title="Show Run Review"
      description="Check whether shows ran as planned, creators attended, and platform issues are cleared."
    >
      <div className="space-y-4">
        <OperationsReviewScopeCard search={search} onSearchChange={updateSearch} />
        <OperationsReviewPreview
          title="Run Checklist"
          description="Use this after submissions are confirmed and the show record is ready for review."
          metrics={[
            {
              label: 'Shows',
              value: '-',
              detail: 'Shows with confirmed start and end times',
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
              description: 'Confirm each show has the actual start and end times needed for review.',
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
  );
}
