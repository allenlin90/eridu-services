import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import type { TaskReportResult } from '@eridu/api-types/task-management';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { taskReportResultKeys } from '@/features/task-reports/api/keys';
import { ReportResultTable } from '@/features/task-reports/components/report-result-table';
import { useTaskReportDefinition } from '@/features/task-reports/hooks/use-task-report-definition';

const taskReportResultsSearchSchema = z.object({
  definition_id: z.string().optional().catch(undefined),
  result_key: z.string().min(1),
});

export const Route = createFileRoute('/studios/$studioId/task-reports/results')({
  component: TaskReportResultsPage,
  validateSearch: (search) => taskReportResultsSearchSchema.parse(search),
});

function TaskReportResultsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const definitionId = search.definition_id;
  const { data: definition } = useTaskReportDefinition({
    studioId,
    definitionId,
  });

  const builderSearch = definitionId ? { definition_id: definitionId } : {};

  const navigateToBuilder = () => {
    void navigate({
      to: '/studios/$studioId/task-reports/builder',
      params: { studioId },
      search: builderSearch,
    });
  };

  const resultQueryKey = taskReportResultKeys.forScope(studioId, search.result_key);
  const { data: result } = useQuery<TaskReportResult | null>({
    queryKey: resultQueryKey,
    queryFn: async () => null,
    enabled: false,
    initialData: () => queryClient.getQueryData<TaskReportResult>(resultQueryKey) ?? null,
  });

  return (
    <PageLayout
      title="Task Report Results"
      description="Review generated report rows and export the full dataset."
      breadcrumbs={(
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start sm:hidden"
            onClick={navigateToBuilder}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Builder
          </Button>
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/studios/$studioId/task-reports" params={{ studioId }}>
                    Task Reports
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/studios/$studioId/task-reports/builder" params={{ studioId }} search={builderSearch}>
                    {definition?.name ?? 'Builder'}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Results</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
    >
      {result
        ? (
            <ReportResultTable result={result} />
          )
        : (
            <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div>
                Result data is unavailable in cache. Please rerun the report from the builder.
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={navigateToBuilder}>
                  Back to Builder
                </Button>
              </div>
            </div>
          )}
    </PageLayout>
  );
}
