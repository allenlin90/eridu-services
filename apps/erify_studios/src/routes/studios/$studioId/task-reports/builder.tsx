import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import type {
  CreateTaskReportDefinitionInput,
  TaskReportResult,
  TaskReportScope,
  TaskReportSelectedColumn,
  UpdateTaskReportDefinitionInput,
} from '@eridu/api-types/task-management';
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
import { getShowStandards } from '@/features/show-standards/api/get-show-standards';
import { getShowTypes } from '@/features/show-types/api/get-show-types';
import { getStudioClients } from '@/features/task-reports/api/get-studio-clients';
import { getTaskReportDefinition } from '@/features/task-reports/api/get-task-report-definition';
import { taskReportDefinitionKeys, taskReportResultKeys } from '@/features/task-reports/api/keys';
import { ReportBuilder } from '@/features/task-reports/components/report-builder';
import { useTaskReportDefinition } from '@/features/task-reports/hooks/use-task-report-definition';
import { useTaskReportDefinitionMutations } from '@/features/task-reports/hooks/use-task-report-definition-mutations';
import { buildTaskReportResultCacheKey } from '@/features/task-reports/lib/build-task-report-result-cache-key';

const taskReportBuilderSearchSchema = z.object({
  definition_id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/task-reports/builder')({
  component: TaskReportBuilderPage,
  validateSearch: (search) => taskReportBuilderSearchSchema.parse(search),
  loader: ({ context: { queryClient }, params: { studioId }, search }) => {
    if (search.definition_id) {
      void queryClient.prefetchQuery({
        queryKey: taskReportDefinitionKeys.detail(studioId, search.definition_id),
        queryFn: ({ signal }) => getTaskReportDefinition(studioId, search.definition_id!, { signal }),
      });
    }
    void queryClient.prefetchQuery({
      queryKey: ['show-types', 'list', studioId, 'report-scope'],
      queryFn: ({ signal }) => getShowTypes({ limit: 200 }, studioId, { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: ['show-standards', 'list', studioId, 'report-scope'],
      queryFn: ({ signal }) => getShowStandards({ limit: 200 }, studioId, { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: ['studio-clients', studioId, 'report-scope'],
      queryFn: ({ signal }) => getStudioClients(studioId, { limit: 200 }, { signal }),
    });
  },
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
    description?: string | null;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => Promise<void>;
  isSavingDefinition: boolean;
  onCancel: () => void;
  onOpenResult: (resultCacheKey: string) => void;
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
  onOpenResult,
}: BuilderWorkspaceProps) {
  const queryClient = useQueryClient();
  const [draftScope, setDraftScope] = useState<TaskReportScope | null>(initialScope);
  const [draftColumns, setDraftColumns] = useState<TaskReportSelectedColumn[]>(initialColumns);

  const currentResultCacheKey = useMemo(() => {
    return buildTaskReportResultCacheKey({
      definitionId,
      scope: draftScope,
      columns: draftColumns,
    });
  }, [definitionId, draftColumns, draftScope]);

  const currentResultQueryKey = useMemo(
    () => taskReportResultKeys.forScope(studioId, currentResultCacheKey),
    [currentResultCacheKey, studioId],
  );
  const { data: cachedResult } = useQuery<TaskReportResult | null>({
    queryKey: currentResultQueryKey,
    queryFn: async () => null,
    enabled: false,
    initialData: () => queryClient.getQueryData<TaskReportResult>(currentResultQueryKey) ?? null,
  });

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
      cachedResult={cachedResult}
      onOpenCachedResult={() => onOpenResult(currentResultCacheKey)}
      onRunSuccess={(result) => {
        queryClient.setQueryData(
          taskReportResultKeys.forScope(studioId, currentResultCacheKey),
          result,
        );
        onOpenResult(currentResultCacheKey);
      }}
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

  const resolvedDefinitionId = definition ? definitionId ?? null : null;
  const workspaceKey = resolvedDefinitionId
    ? `definition:${resolvedDefinitionId}`
    : definitionId
      ? `definition:recovery:${definitionId}`
      : 'definition:new';
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

  const navigateToResults = (resultCacheKey: string) => {
    void navigate({
      to: '/studios/$studioId/task-reports/results',
      params: { studioId },
      search: resolvedDefinitionId
        ? { definition_id: resolvedDefinitionId, result_key: resultCacheKey }
        : { result_key: resultCacheKey },
    });
  };

  const handleSaveDefinition = async (input: {
    name: string;
    description?: string | null;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => {
    const definitionPayload = {
      scope: input.scope,
      columns: input.columns,
    };

    if (resolvedDefinitionId && definition) {
      const updatePayload: UpdateTaskReportDefinitionInput = {
        name: input.name,
        description: input.description,
        definition: definitionPayload,
        version: definition.version,
      };
      await updateMutation.mutateAsync({ definitionId: resolvedDefinitionId, payload: updatePayload });
      toast.success('Report definition saved.');
      return;
    }

    const createPayload: CreateTaskReportDefinitionInput = {
      name: input.name,
      ...(typeof input.description === 'string' ? { description: input.description } : {}),
      definition: definitionPayload,
    };
    const created = await createMutation.mutateAsync(createPayload);
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
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start sm:hidden"
            onClick={navigateToDefinitions}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Definitions
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
          <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div>
              Failed to load the selected definition. You can still rebuild the report as a new draft.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigate({
                    to: '/studios/$studioId/task-reports/builder',
                    params: { studioId },
                    search: {},
                    replace: true,
                  });
                }}
              >
                Start as New Report
              </Button>
              <Button variant="ghost" size="sm" onClick={navigateToDefinitions}>
                Back to Definitions
              </Button>
            </div>
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
                definitionId={resolvedDefinitionId}
                initialScope={initialScope}
                initialColumns={initialColumns}
                initialDefinitionName={initialDefinitionName}
                initialDefinitionDescription={initialDefinitionDescription}
                onSaveDefinition={handleSaveDefinition}
                isSavingDefinition={isSavingDefinition}
                onCancel={navigateToDefinitions}
                onOpenResult={navigateToResults}
              />
            )
          : null}
      </div>
    </PageLayout>
  );
}
