import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import type { TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { ReportBuilder } from '@/features/task-reports/components/report-builder';
import { ReportResultTable } from '@/features/task-reports/components/report-result-table';
import { useTaskReportDefinition } from '@/features/task-reports/hooks/use-task-report-definition';

const taskReportBuilderSearchSchema = z.object({
  definition_id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/task-reports/builder')({
  component: TaskReportBuilderPage,
  validateSearch: (search) => taskReportBuilderSearchSchema.parse(search),
});

type BuilderWorkspaceProps = {
  studioId: string;
  definitionId: string | null;
  initialScope: TaskReportScope | null;
  initialColumns: TaskReportSelectedColumn[];
  onCancel: () => void;
};

function BuilderWorkspace({
  studioId,
  definitionId,
  initialScope,
  initialColumns,
  onCancel,
}: BuilderWorkspaceProps) {
  const [draftScope, setDraftScope] = useState<TaskReportScope | null>(initialScope);
  const [draftColumns, setDraftColumns] = useState<TaskReportSelectedColumn[]>(initialColumns);
  const [reportResult, setReportResult] = useState<TaskReportResult | null>(null);

  if (reportResult) {
    return (
      <ReportResultTable
        result={reportResult}
        onBack={() => setReportResult(null)}
      />
    );
  }

  return (
    <ReportBuilder
      studioId={studioId}
      draftScope={draftScope}
      setDraftScope={setDraftScope}
      draftColumns={draftColumns}
      setDraftColumns={setDraftColumns}
      definitionId={definitionId}
      onCancel={onCancel}
      onRunSuccess={(result) => setReportResult(result)}
    />
  );
}

function TaskReportBuilderPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const definitionId = search.definition_id;

  const { data: definition, isLoading: isLoadingDefinition, isError: isDefinitionError } = useTaskReportDefinition({
    studioId,
    definitionId,
  });

  const workspaceKey = definitionId ? `definition:${definitionId}` : 'definition:new';
  const initialScope = definition?.definition.scope ?? null;
  const initialColumns = definition?.definition.columns ?? [];

  return (
    <PageLayout
      title="Task Report Builder"
      description="Build and run studio-scoped task reports with mandatory date range scope."
      actions={(
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigate({
              to: '/studios/$studioId/task-reports',
              params: { studioId },
            });
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Definitions
        </Button>
      )}
    >
      <div className="space-y-4">
        {definitionId && isLoadingDefinition && (
          <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
            Loading report definition...
          </div>
        )}
        {definitionId && isDefinitionError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load the selected definition. You can still build a report manually.
          </div>
        )}
        {definitionId && definition && (
          <div className="rounded-md border px-4 py-3 text-sm">
            Loaded definition:
            {' '}
            <strong>{definition.name}</strong>
          </div>
        )}
        {!definitionId || definition || isDefinitionError
          ? (
              <BuilderWorkspace
                key={workspaceKey}
                studioId={studioId}
                definitionId={definitionId ?? null}
                initialScope={initialScope}
                initialColumns={initialColumns}
                onCancel={() => {
                  void navigate({
                    to: '/studios/$studioId/task-reports',
                    params: { studioId },
                  });
                }}
              />
            )
          : null}
      </div>
    </PageLayout>
  );
}
