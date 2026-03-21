import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { TaskReportPreflightResponse, TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@eridu/ui';

import { getStudioClients } from '../api/get-studio-clients';
import { useTaskReportMutations } from '../hooks/use-task-report-mutations';
import { useTaskReportSources } from '../hooks/use-task-report-sources';

import { ReportColumnPicker } from './report-column-picker';
import { ReportScopeFilters } from './report-scope-filters';

import { getShowStandards } from '@/features/show-standards/api/get-show-standards';
import { getShowTypes } from '@/features/show-types/api/get-show-types';

type ReportBuilderProps = {
  studioId: string;
  draftScope: TaskReportScope | null;
  setDraftScope: (scope: TaskReportScope | null) => void;
  draftColumns: TaskReportSelectedColumn[];
  setDraftColumns: (columns: TaskReportSelectedColumn[]) => void;
  definitionId?: string | null;
  initialDefinitionName?: string;
  initialDefinitionDescription?: string | null;
  onSaveDefinition?: (input: {
    name: string;
    description?: string | null;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => Promise<void>;
  isSavingDefinition?: boolean;
  onCancel?: () => void;
  cachedResult?: TaskReportResult | null;
  onOpenCachedResult?: () => void;
  onRunSuccess?: (result: TaskReportResult) => void;
};

export function ReportBuilder({
  studioId,
  draftScope,
  setDraftScope,
  draftColumns,
  setDraftColumns,
  definitionId,
  initialDefinitionName,
  initialDefinitionDescription,
  onSaveDefinition,
  isSavingDefinition = false,
  onCancel,
  cachedResult,
  onOpenCachedResult,
  onRunSuccess,
}: ReportBuilderProps) {
  const [definitionName, setDefinitionName] = React.useState(initialDefinitionName ?? '');
  const [definitionDescription, setDefinitionDescription] = React.useState(initialDefinitionDescription ?? '');
  const [preflightData, setPreflightData] = React.useState<TaskReportPreflightResponse | null>(null);
  const { preflightMutation, runMutation } = useTaskReportMutations(studioId);
  const scopeForTemplateLookup = React.useMemo<TaskReportScope | null>(() => {
    if (!draftScope) {
      return null;
    }
    const { source_templates: _ignored, ...rest } = draftScope;
    return Object.keys(rest).length > 0 ? rest : null;
  }, [draftScope]);
  const { data: sourceDataForTemplateLookup } = useTaskReportSources(studioId, scopeForTemplateLookup);
  // Derive the source-templates-filtered view client-side to avoid a second network request.
  const sourceDataForScope = React.useMemo(() => {
    if (!sourceDataForTemplateLookup)
      return undefined;
    if (!draftScope?.source_templates?.length)
      return sourceDataForTemplateLookup;
    return {
      ...sourceDataForTemplateLookup,
      sources: sourceDataForTemplateLookup.sources.filter((s) =>
        draftScope.source_templates!.includes(s.template_id),
      ),
    };
  }, [sourceDataForTemplateLookup, draftScope]);

  // Clear preflight status if scope or columns change
  React.useEffect(() => {
    setPreflightData(null);
  }, [draftScope, draftColumns]);
  React.useEffect(() => {
    setDefinitionName(initialDefinitionName ?? '');
    setDefinitionDescription(initialDefinitionDescription ?? '');
  }, [definitionId, initialDefinitionDescription, initialDefinitionName]);

  const hasRequiredScope = Boolean(draftScope?.date_from && draftScope?.date_to);
  const isPending = preflightMutation.isPending || runMutation.isPending || isSavingDefinition;

  const sourceTemplateOptions = React.useMemo(() => {
    return (sourceDataForTemplateLookup?.sources || []).map((source) => ({
      label: source.template_name,
      value: source.template_id,
    }));
  }, [sourceDataForTemplateLookup?.sources]);

  const { data: showTypesData } = useQuery({
    queryKey: ['show-types', 'list', studioId, 'report-scope'],
    queryFn: ({ signal }) => getShowTypes({ limit: 200 }, studioId, { signal }),
  });
  const showTypeOptions = (showTypesData?.data ?? []).map((item) => ({ label: item.name, value: item.id }));

  const { data: showStandardsData } = useQuery({
    queryKey: ['show-standards', 'list', studioId, 'report-scope'],
    queryFn: ({ signal }) => getShowStandards({ limit: 200 }, studioId, { signal }),
  });
  const showStandardOptions = (showStandardsData?.data ?? []).map((item) => ({ label: item.name, value: item.id }));

  const { data: clientsData } = useQuery({
    queryKey: ['studio-clients', studioId, 'report-scope'],
    queryFn: ({ signal }) => getStudioClients(studioId, { limit: 200 }, { signal }),
  });
  const clientOptions = (clientsData?.data ?? []).map((item) => ({ label: item.name, value: item.id }));

  const incompatibleColumns = React.useMemo(() => {
    if (!hasRequiredScope || !sourceDataForScope) {
      return [];
    }

    const availableKeys = new Set<string>(Object.values(TASK_REPORT_SYSTEM_COLUMN));

    for (const sharedField of sourceDataForScope.shared_fields) {
      availableKeys.add(sharedField.key);
    }
    for (const source of sourceDataForScope.sources) {
      for (const field of source.fields) {
        availableKeys.add(field.key);
      }
    }

    return draftColumns.filter((column) => !availableKeys.has(column.key));
  }, [draftColumns, hasRequiredScope, sourceDataForScope]);

  const canSaveDefinition = hasRequiredScope
    && draftColumns.length > 0
    && incompatibleColumns.length === 0
    && !isPending;
  const canPreflight = hasRequiredScope
    && draftColumns.length > 0
    && incompatibleColumns.length === 0
    && !isPending;
  const canRun = canPreflight
    && Boolean(preflightData)
    && preflightData.show_count > 0
    && preflightData.within_limit;
  const hasSelectedColumns = draftColumns.length > 0;
  const hasCompatibleSelection = hasSelectedColumns && incompatibleColumns.length === 0;
  const preflightState = !preflightData
    ? 'idle'
    : preflightData.show_count === 0
      ? 'empty'
      : preflightData.within_limit
        ? 'ready'
        : 'over_limit';
  const preflightOverLimitByShows = Boolean(preflightData && preflightData.show_count > preflightData.limit);

  const steps = [
    {
      title: 'Scope',
      description: hasRequiredScope ? 'Date range selected' : 'Date range required',
      state: hasRequiredScope ? 'complete' : 'current',
    },
    {
      title: 'Columns',
      description: hasCompatibleSelection ? `${draftColumns.length} selected` : hasSelectedColumns ? 'Resolve conflicts' : 'Pick report fields',
      state: hasCompatibleSelection ? 'complete' : hasRequiredScope ? 'current' : 'upcoming',
    },
    {
      title: 'Preflight',
      description: preflightState === 'ready'
        ? `${preflightData?.show_count ?? 0} shows ready`
        : preflightState === 'over_limit'
          ? 'Scope too large'
          : preflightState === 'empty'
            ? 'No matching shows'
            : 'Confirm before run',
      state: canRun ? 'complete' : hasCompatibleSelection ? 'current' : 'upcoming',
    },
    {
      title: 'Save',
      description: 'Optional preset',
      state: 'optional',
    },
  ] as const;

  const handlePreflightClick = async () => {
    if (!draftScope || draftColumns.length === 0 || incompatibleColumns.length > 0)
      return;

    try {
      const res = await preflightMutation.mutateAsync(draftScope);
      setPreflightData(res);
      if (res.show_count === 0) {
        toast.warning('The selected scope results in 0 shows. Please adjust filters.');
      }
      if (!res.within_limit) {
        if (res.show_count > res.limit) {
          toast.error(`The selected scope includes ${res.show_count} shows (limit: ${res.limit}). Narrow the filters and preflight again.`);
        } else {
          toast.error(`The selected scope exceeds the limit (${res.limit} tasks). Narrow the filters and preflight again.`);
        }
      }
    } catch {
      // onError in mutation config handles user-facing feedback
    }
  };

  const handleRunClick = async () => {
    if (
      !draftScope
      || draftColumns.length === 0
      || incompatibleColumns.length > 0
      || !preflightData
      || preflightData.show_count === 0
      || !preflightData.within_limit
    ) {
      return;
    }

    try {
      const result = await runMutation.mutateAsync({
        scope: draftScope,
        columns: draftColumns,
        definition_id: definitionId || undefined,
      });

      // Switch to view
      onRunSuccess?.(result);
    } catch {
      // onError in mutation config handles user-facing feedback
    }
  };

  const handleSaveDefinition = async () => {
    if (!onSaveDefinition) {
      return;
    }

    const trimmedName = definitionName.trim();
    const trimmedDescription = definitionDescription.trim();
    const normalizedDescription = trimmedDescription.length > 0
      ? trimmedDescription
      : definitionId
        ? null
        : undefined;

    if (!trimmedName) {
      toast.error('Enter a definition name before saving.');
      return;
    }

    if (!draftScope || !hasRequiredScope) {
      toast.error('Set a complete date range before saving.');
      return;
    }

    if (draftColumns.length === 0) {
      toast.error('Select at least one column before saving.');
      return;
    }

    if (incompatibleColumns.length > 0) {
      toast.error('Resolve incompatible columns before saving.');
      return;
    }

    try {
      await onSaveDefinition({
        name: trimmedName,
        description: normalizedDescription,
        scope: draftScope,
        columns: draftColumns,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to save report definition.');
    }
  };

  const cachedResultAvailable = Boolean(cachedResult && onOpenCachedResult);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Build Report</CardTitle>
          <CardDescription>
            Set the reporting scope first, choose columns second, then preflight before you run. Saving a reusable definition is optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-md border px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Step
                    {' '}
                    {index + 1}
                  </span>
                  <Badge
                    variant={
                      step.state === 'complete'
                        ? 'default'
                        : step.state === 'optional'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {step.state === 'complete'
                      ? 'Ready'
                      : step.state === 'optional'
                        ? 'Optional'
                        : step.state === 'current'
                          ? 'In Progress'
                          : 'Pending'}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">{step.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{step.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {cachedResultAvailable
        ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Last Generated Result Available</CardTitle>
                <CardDescription>
                  Reopen the cached result for this exact scope and column set without rerunning the report.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Generated
                  {' '}
                  <strong>{format(new Date(cachedResult!.generated_at), 'PPp')}</strong>
                  {' · '}
                  {cachedResult!.row_count}
                  {' '}
                  rows
                </div>
                <Button variant="outline" size="sm" onClick={onOpenCachedResult!}>
                  View Cached Result
                </Button>
              </CardContent>
            </Card>
          )
        : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Set Scope Filters</CardTitle>
          <CardDescription>
            Date range is required. Additional filters narrow the matched studio shows used for reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportScopeFilters
            studioId={studioId}
            scope={draftScope}
            sourceTemplateOptions={sourceTemplateOptions}
            showTypeOptions={showTypeOptions}
            showStandardOptions={showStandardOptions}
            clientOptions={clientOptions}
            onChange={setDraftScope}
          />
        </CardContent>
      </Card>

      <Card className={!hasRequiredScope ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
        <CardHeader>
          <CardTitle>2. Select Columns</CardTitle>
          <CardDescription>
            Choose which data fields to include in your report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRequiredScope
            ? (
                <ReportColumnPicker
                  studioId={studioId}
                  scope={draftScope}
                  selectedColumns={draftColumns}
                  onChange={setDraftColumns}
                  sourcesData={sourceDataForTemplateLookup}
                />
              )
            : (
                <div className="text-sm text-dimmed">Set a complete date range first to load contextual columns.</div>
              )}
        </CardContent>
      </Card>

      {incompatibleColumns.length > 0
        ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="font-semibold mb-2">Definition Conflict Detected</div>
              <div className="mb-3">
                Some selected columns are not available in the current scope. Remove or replace them before preflight/run.
              </div>
              <div className="flex flex-wrap gap-2">
                {incompatibleColumns.map((column) => (
                  <Button
                    key={column.key}
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setDraftColumns(draftColumns.filter((item) => item.key !== column.key));
                    }}
                  >
                    Remove:
                    {' '}
                    {column.label}
                  </Button>
                ))}
              </div>
            </div>
          )
        : null}

      <Card>
        <CardHeader>
          <CardTitle>3. Preflight & Run</CardTitle>
          <CardDescription>
            Preflight gives you a durable scope check before report generation. Run is enabled only after a successful preflight.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={!canPreflight}
              onClick={() => void handlePreflightClick()}
              className="sm:flex-1"
            >
              {preflightMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Preflight Scope
            </Button>
            <Button
              disabled={!canRun}
              onClick={() => void handleRunClick()}
              className="sm:flex-1"
            >
              {runMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Report
            </Button>
          </div>

          {preflightState === 'idle' && hasCompatibleSelection
            ? (
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Preflight this scope to confirm row volume before generating the report.
                </div>
              )
            : null}

          {preflightState === 'ready' && preflightData
            ? (
                <Card className="border-emerald-200 bg-emerald-50/70">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-emerald-900">Preflight Passed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3 text-sm text-emerald-950">
                    <div>
                      This run will process
                      {' '}
                      <strong>{preflightData.show_count}</strong>
                      {' '}
                      shows and
                      {' '}
                      <strong>{preflightData.task_count}</strong>
                      {' '}
                      tasks.
                    </div>
                    <div className="text-xs text-emerald-900/80">
                      Scope is valid. You can run immediately or save this setup as a reusable definition first.
                    </div>
                  </CardContent>
                </Card>
              )
            : null}

          {preflightState === 'empty'
            ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <div className="mb-1 font-semibold">No Matches Found</div>
                  <div>The selected scope results in 0 shows. Adjust the date range or narrow filters before you run again.</div>
                </div>
              )
            : null}

          {preflightState === 'over_limit' && preflightData
            ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <div className="mb-1 font-semibold">Scope Too Large</div>
                  <div>
                    Preflight found
                    {' '}
                    <strong>{preflightOverLimitByShows ? preflightData.show_count : preflightData.task_count}</strong>
                    {' '}
                    {preflightOverLimitByShows ? 'shows' : 'tasks'}
                    , which exceeds the limit of
                    {' '}
                    <strong>{preflightData.limit}</strong>
                    .
                  </div>
                  <div className="mt-2 text-xs text-destructive/90">
                    Narrow the date range, source templates, or other filters before preflighting again.
                  </div>
                </div>
              )
            : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Save Definition (Optional)</CardTitle>
          <CardDescription>
            Save this report setup if you want to rerun or tweak it later from the Task Reports landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-definition-name">Definition Name</Label>
            <Input
              id="report-definition-name"
              value={definitionName}
              onChange={(event) => setDefinitionName(event.target.value)}
              placeholder="e.g. Weekly moderation report"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-definition-description">Description (optional)</Label>
            <Textarea
              id="report-definition-description"
              value={definitionDescription}
              onChange={(event) => setDefinitionDescription(event.target.value)}
              placeholder="Explain when this report should be used"
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              disabled={!canSaveDefinition}
              onClick={() => void handleSaveDefinition()}
              className="sm:flex-1"
            >
              {isSavingDefinition && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {definitionId ? 'Save Definition' : 'Save as Definition'}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isPending} className="sm:flex-1">
              Back to Definitions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
