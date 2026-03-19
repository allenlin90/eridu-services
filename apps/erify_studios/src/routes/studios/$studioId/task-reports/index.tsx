import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PageLayout } from '@/components/layouts/page-layout';
import { TaskReportDefinitionsViewer } from '@/features/task-reports/components/task-report-definitions-viewer';

const taskReportDefinitionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/task-reports/')({
  component: TaskReportsDefinitionsPage,
  validateSearch: (search) => taskReportDefinitionsSearchSchema.parse(search),
});

function TaskReportsDefinitionsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <PageLayout
      title="Task Reports"
      description="Saved report definitions for studio-scoped reporting."
    >
      <TaskReportDefinitionsViewer
        studioId={studioId}
        page={search.page}
        limit={search.limit}
        search={search.search}
        onSearchChange={(value) => {
          void navigate({
            to: '/studios/$studioId/task-reports',
            params: { studioId },
            search: (prev) => ({
              ...prev,
              page: 1,
              search: value,
            }),
            replace: true,
          });
        }}
        onPageChange={(nextPage) => {
          void navigate({
            to: '/studios/$studioId/task-reports',
            params: { studioId },
            search: (prev) => ({
              ...prev,
              page: nextPage,
            }),
            replace: true,
          });
        }}
        onCreateNew={() => {
          void navigate({
            to: '/studios/$studioId/task-reports/builder',
            params: { studioId },
            search: {},
          });
        }}
        onOpenBuilder={(definitionId) => {
          void navigate({
            to: '/studios/$studioId/task-reports/builder',
            params: { studioId },
            search: { definition_id: definitionId },
          });
        }}
      />
    </PageLayout>
  );
}
