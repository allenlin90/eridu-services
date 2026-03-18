import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { TaskReportPreflightResponse, TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';

import { useTaskReportMutations } from '../hooks/use-task-report-mutations';

import { ReportColumnPicker } from './report-column-picker';
import { ReportScopeFilters } from './report-scope-filters';

type ReportBuilderProps = {
  studioId: string;
  draftScope: TaskReportScope | null;
  setDraftScope: (scope: TaskReportScope | null) => void;
  draftColumns: TaskReportSelectedColumn[];
  setDraftColumns: (columns: TaskReportSelectedColumn[]) => void;
  onCancel?: () => void;
  onRunSuccess?: (result: TaskReportResult) => void;
};

export function ReportBuilder({
  studioId,
  draftScope,
  setDraftScope,
  draftColumns,
  setDraftColumns,
  onCancel,
  onRunSuccess,
}: ReportBuilderProps) {
  const [preflightData, setPreflightData] = React.useState<TaskReportPreflightResponse | null>(null);
  const { preflightMutation, runMutation } = useTaskReportMutations(studioId);

  // Clear preflight status if scope or columns change
  React.useEffect(() => {
    setPreflightData(null);
  }, [draftScope, draftColumns]);

  const hasScope = draftScope !== null && Object.keys(draftScope).length > 0;
  const isPending = preflightMutation.isPending || runMutation.isPending;

  const handleRunClick = async () => {
    if (!draftScope || draftColumns.length === 0)
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
      // For now, no sorting specified.
    });

    // Switch to view
    onRunSuccess?.(result);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Select Shows</CardTitle>
          <CardDescription>
            Filter which shows to include in the report. This determines the pool of tasks and available columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportScopeFilters
            studioId={studioId}
            scope={draftScope}
            onChange={setDraftScope}
          />
        </CardContent>
      </Card>

      <Card className={!hasScope ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
        <CardHeader>
          <CardTitle>2. Select Columns</CardTitle>
          <CardDescription>
            Choose which data fields to include in your report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasScope
            ? (
                <ReportColumnPicker
                  studioId={studioId}
                  scope={draftScope}
                  selectedColumns={draftColumns}
                  onChange={setDraftColumns}
                />
              )
            : (
                <div className="text-sm text-dimmed">Please establish a scope filter first to load available columns.</div>
              )}
        </CardContent>
      </Card>

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
          disabled={!hasScope || draftColumns.length === 0 || isPending || preflightData?.show_count === 0}
          onClick={handleRunClick}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {preflightData ? 'Confirm & Run' : 'Preflight & Run'}
        </Button>
      </div>
    </div>
  );
}
