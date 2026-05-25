import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { CheckCircle2, ClipboardCheck, ListChecks, TriangleAlert } from 'lucide-react';
import { useCallback } from 'react';

import { PageLayout } from '@/components/layouts/page-layout';
import { OperationsReviewPreview } from '@/features/operations-review/components/operations-review-preview';
import {
  OperationsReviewScopeCard,
  type OperationsReviewSearch,
} from '@/features/operations-review/components/operations-review-scope-card';

const operationsReviewRouteApi = getRouteApi('/studios/$studioId/operations-review');

export const Route = createFileRoute('/studios/$studioId/operations-review/submissions')({
  component: SubmissionReviewPage,
});

function SubmissionReviewPage() {
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
      title="Submission Review"
      description="Confirm submitted work before it updates the show record."
    >
      <div className="space-y-4">
        <OperationsReviewScopeCard search={search} onSearchChange={updateSearch} />
        <OperationsReviewPreview
          title="Review Queue"
          description="Start here when operators have submitted work that needs manager confirmation."
          metrics={[
            {
              label: 'Waiting',
              value: '-',
              detail: 'Submitted tasks pending review',
            },
            {
              label: 'Ready',
              value: '-',
              detail: 'Submissions eligible for bulk approval',
              tone: 'success',
            },
            {
              label: 'Needs Follow-Up',
              value: '-',
              detail: 'Missing inputs, stale targets, or exceptions',
              tone: 'warning',
            },
            {
              label: 'Approved Today',
              value: '-',
              detail: 'Confirmed submissions moved into show records',
            },
          ]}
          steps={[
            {
              title: 'Review submitted tasks',
              description: 'Group pending submissions by show, phase, and assigned operator.',
              icon: <ClipboardCheck className="h-4 w-4 text-blue-600" />,
            },
            {
              title: 'Highlight blockers',
              description: 'Call out missing answers, stale creator/platform inputs, and late reasons before approval.',
              icon: <TriangleAlert className="h-4 w-4 text-amber-600" />,
            },
            {
              title: 'Bulk approve clean rows',
              description: 'Let managers confirm multiple eligible submissions without opening each task one by one.',
              icon: <ListChecks className="h-4 w-4 text-slate-700" />,
            },
            {
              title: 'Send confirmed work forward',
              description: 'Approved tasks become trusted show records that the Show Run Review page can summarize.',
              icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
