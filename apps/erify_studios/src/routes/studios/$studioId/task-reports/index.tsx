import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PageLayout } from '@/components/layouts/page-layout';
import { TaskReportDefinitionsViewer } from '@/features/task-reports/components/task-report-definitions-viewer';
import { useTaskReportDefinitionsPageController } from '@/features/task-reports/hooks/use-task-report-definitions-page-controller';

const taskReportDefinitionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/task-reports/')({
  component: TaskReportsDefinitionsPage,
  validateSearch: (search) => taskReportDefinitionsSearchSchema.parse(search),
});

function TaskReportsDefinitionsPage() {
  const { studioId } = Route.useParams();
  const navigate = Route.useNavigate();
  const {
    data,
    pagination,
    onPaginationChange,
    search,
    onSearchChange,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useTaskReportDefinitionsPageController({ studioId });

  return (
    <PageLayout
      title="Task Reports"
      description="Saved report definitions for studio-scoped reporting."
    >
      <TaskReportDefinitionsViewer
        studioId={studioId}
        definitions={data?.data ?? []}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        search={search}
        onSearchChange={onSearchChange}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRefresh={() => {
          void refetch();
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
