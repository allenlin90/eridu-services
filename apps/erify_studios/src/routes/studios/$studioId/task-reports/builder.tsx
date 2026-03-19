import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import type { TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
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
import { ReportBuilder } from '@/features/task-reports/components/report-builder';
import { ReportResultTable } from '@/features/task-reports/components/report-result-table';
import { useTaskReportDefinition } from '@/features/task-reports/hooks/use-task-report-definition';
import { useTaskReportDefinitionMutations } from '@/features/task-reports/hooks/use-task-report-definition-mutations';

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
  initialDefinitionName?: string;
  initialDefinitionDescription?: string | null;
  onSaveDefinition: (input: {
    name: string;
    description?: string;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => Promise<void>;
  isSavingDefinition: boolean;
  onCancel: () => void;
};

function BuilderWorkspace({
  studioId,
  definitionId,
  initialScope,
  initialColumns,
  initialDefinitionName,
  initialDefinitionDescription,
  onSaveDefinition,
  isSavingDefinition,
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
      initialDefinitionName={initialDefinitionName}
      initialDefinitionDescription={initialDefinitionDescription}
      onSaveDefinition={onSaveDefinition}
      isSavingDefinition={isSavingDefinition}
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
  const { createMutation, updateMutation } = useTaskReportDefinitionMutations({ studioId });

  const workspaceKey = definitionId ? `definition:${definitionId}` : 'definition:new';
  const initialScope = definition?.definition.scope ?? null;
  const initialColumns = definition?.definition.columns ?? [];
  const initialDefinitionName = definition?.name;
  const initialDefinitionDescription = definition?.description;
  const isDefinitionLoaded = Boolean(definitionId && definition);
  const isSavingDefinition = createMutation.isPending || updateMutation.isPending;

  const navigateToDefinitions = () => {
    void navigate({
      to: '/studios/$studioId/task-reports',
      params: { studioId },
    });
  };

  const handleSaveDefinition = async (input: {
    name: string;
    description?: string;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => {
    const payload = {
      name: input.name,
      description: input.description,
      definition: {
        scope: input.scope,
        columns: input.columns,
      },
    };

    if (definitionId) {
      await updateMutation.mutateAsync({ definitionId, payload });
      toast.success('Report definition saved.');
      return;
    }

    const created = await createMutation.mutateAsync(payload);
    toast.success('Report definition created.');
    void navigate({
      to: '/studios/$studioId/task-reports/builder',
      params: { studioId },
      search: { definition_id: created.id },
      replace: true,
    });
  };

  return (
    <PageLayout
      title="Task Report Builder"
      description="Build and run studio-scoped task reports with mandatory date range scope."
      breadcrumbs={(
        <div className="space-y-2">
          <div className="sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={navigateToDefinitions}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Definitions
            </Button>
          </div>
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
                <BreadcrumbPage>{isDefinitionLoaded ? definition.name : 'Builder'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
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
                initialDefinitionName={initialDefinitionName}
                initialDefinitionDescription={initialDefinitionDescription}
                onSaveDefinition={handleSaveDefinition}
                isSavingDefinition={isSavingDefinition}
                onCancel={navigateToDefinitions}
              />
            )
          : null}
      </div>
    </PageLayout>
  );
}
