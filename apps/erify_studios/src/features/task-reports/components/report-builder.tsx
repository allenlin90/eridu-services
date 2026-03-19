import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { TaskReportPreflightResponse, TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';

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
  onCancel,
  onRunSuccess,
}: ReportBuilderProps) {
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

  const hasRequiredScope = Boolean(draftScope?.date_from && draftScope?.date_to);
  const isPending = preflightMutation.isPending || runMutation.isPending;

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

  const handleRunClick = async () => {
    if (!draftScope || draftColumns.length === 0 || incompatibleColumns.length > 0)
      return;

    if (!preflightData) {
      // Step 1: Preflight
      const res = await preflightMutation.mutateAsync({
        scope: draftScope,
      });
      setPreflightData(res);
      if (res.show_count === 0) {
        toast.warning('The selected scope results in 0 shows. Please adjust filters.');
      }
      return; // Wait for user to confirm the preflight
    }

    // Step 2: Run
    const result = await runMutation.mutateAsync({
      scope: draftScope,
      columns: draftColumns,
      definition_id: definitionId || undefined,
    });

    // Switch to view
    onRunSuccess?.(result);
  };

  return (
    <div className="space-y-6">
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          disabled={!hasRequiredScope || draftColumns.length === 0 || incompatibleColumns.length > 0 || isPending || preflightData?.show_count === 0}
          onClick={handleRunClick}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {preflightData ? 'Confirm & Run' : 'Preflight & Run'}
        </Button>
      </div>
    </div>
  );
}
