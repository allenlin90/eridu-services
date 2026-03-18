import type { TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';

import { ReportBuilder } from './report-builder';
import { ReportResultTable } from './report-result-table';

export type TaskReportsRouteState = {
  view: 'list' | 'builder';
  setView: (view: 'list' | 'builder') => void;
  activeDefinitionId: string | null;
  setActiveDefinitionId: (id: string | null) => void;
  draftScope: TaskReportScope | null;
  setDraftScope: (scope: TaskReportScope | null) => void;
  draftColumns: TaskReportSelectedColumn[];
  setDraftColumns: (columns: TaskReportSelectedColumn[]) => void;
  reportResult: TaskReportResult | null;
  setReportResult: (result: TaskReportResult | null) => void;
};

export type TaskReportsIndexProps = TaskReportsRouteState & {
  studioId: string;
};

export function TaskReportsIndex({
  view,
  studioId,
  draftScope,
  setDraftScope,
  draftColumns,
  setDraftColumns,
  reportResult,
  setReportResult,
}: TaskReportsIndexProps) {
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div>Definition List View (Coming Soon)</div>
        <button type="button" onClick={() => {}} className="text-primary underline">Create New Report (Go to Builder)</button>
      </div>
    );
  }

  // Builder View
  if (reportResult) {
    return (
      <div className="space-y-6">
        <ReportResultTable
          result={reportResult}
          onBack={() => setReportResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportBuilder
        studioId={studioId}
        draftScope={draftScope}
        setDraftScope={setDraftScope}
        draftColumns={draftColumns}
        setDraftColumns={setDraftColumns}
        onRunSuccess={(result) => setReportResult(result)}
      />
    </div>
  );
}
