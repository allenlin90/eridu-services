import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { TaskReportPreflightResponse, TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@eridu/ui';

import { useTaskReportMutations } from '../hooks/use-task-report-mutations';
import { useTaskReportSources } from '../hooks/use-task-report-sources';

import { ReportColumnPicker } from './report-column-picker';
import { ReportScopeFilters } from './report-scope-filters';

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
    description?: string;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => Promise<void>;
  isSavingDefinition?: boolean;
  onCancel?: () => void;
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
  const { data: sourceDataForScope } = useTaskReportSources(studioId, draftScope);

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

  const handlePreflightClick = async () => {
    if (!draftScope || draftColumns.length === 0 || incompatibleColumns.length > 0)
      return;

    const res = await preflightMutation.mutateAsync({
      scope: draftScope,
    });
    setPreflightData(res);
    if (res.show_count === 0) {
      toast.warning('The selected scope results in 0 shows. Please adjust filters.');
    }
    if (!res.within_limit) {
      toast.error(`The selected scope exceeds the limit (${res.limit} tasks). Narrow the filters and preflight again.`);
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

    const result = await runMutation.mutateAsync({
      scope: draftScope,
      columns: draftColumns,
      definition_id: definitionId || undefined,
    });

    // Switch to view
    onRunSuccess?.(result);
  };

  const handleSaveDefinition = async () => {
    if (!onSaveDefinition) {
      return;
    }

    const trimmedName = definitionName.trim();
    const trimmedDescription = definitionDescription.trim();

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
        description: trimmedDescription || undefined,
        scope: draftScope,
        columns: draftColumns,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to save report definition.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Definition</CardTitle>
          <CardDescription>
            Save this report setup so you can reopen it from Task Reports anytime.
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
        </CardContent>
      </Card>

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
                />
              )
            : (
                <div className="text-sm text-dimmed">Set a complete date range first to load contextual columns.</div>
              )}
        </CardContent>
      </Card>

      {incompatibleColumns.length > 0 && (
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
      )}

      {preflightData && preflightData.show_count > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Preflight Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            This report will process exactly
            {' '}
            <strong>{preflightData.show_count}</strong>
            {' '}
            shows and
            {' '}
            <strong>{preflightData.task_count}</strong>
            {' '}
            tasks.
          </CardContent>
        </Card>
      )}

      {preflightData?.show_count === 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/15 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold mb-1">No Matches Found</div>
          <div>The selected scope results in 0 shows. Please adjust your filters.</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>3. Review & Actions</CardTitle>
          <CardDescription>
            Save this definition for reuse, then preflight and run your report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-semibold">Definition Actions</div>
                <div className="text-xs text-muted-foreground">
                  Keep this setup for future runs or return to the definitions list.
                </div>
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
                  Cancel
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-semibold">Run Actions</div>
                <div className="text-xs text-muted-foreground">
                  Always run preflight first. Run stays disabled until preflight succeeds.
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  disabled={!canPreflight}
                  onClick={() => void handlePreflightClick()}
                  className="sm:flex-1"
                >
                  {preflightMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Preflight
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
