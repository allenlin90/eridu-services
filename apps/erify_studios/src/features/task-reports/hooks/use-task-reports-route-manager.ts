import { useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import type { TaskReportResult, TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';

import type { TaskReportsRouteState } from '../components/task-reports-index';

export function useTaskReportsRouteManager(_studioId: string, searchParams: any): TaskReportsRouteState {
  const navigate = useNavigate();

  const [view, setView] = React.useState<'list' | 'builder'>(searchParams.definition_uid ? 'builder' : 'list');
  const [activeDefinitionId, setActiveDefinitionId] = React.useState<string | null>(searchParams.definition_uid || null);

  // Initialize draft scope from searchParams (if provided)
  const initialScope = React.useMemo(() => {
    const scopeKeys = ['date_preset', 'date_from', 'date_to', 'show_standard_id', 'show_type_id', 'show_ids', 'submitted_statuses', 'source_templates'];
    const scope: any = {};
    let hasData = false;
    for (const key of scopeKeys) {
      if (searchParams[key] !== undefined) {
        scope[key] = searchParams[key];
        hasData = true;
      }
    }
    return hasData ? (scope as TaskReportScope) : null;
  }, [searchParams]);

  const [draftScope, setLocalDraftScope] = React.useState<TaskReportScope | null>(initialScope);

  const setDraftScope = React.useCallback((scope: TaskReportScope | null) => {
    setLocalDraftScope(scope);
    // Sync to URL
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        const keysToRemove = ['date_preset', 'date_from', 'date_to', 'show_standard_id', 'show_type_id', 'show_ids', 'submitted_statuses', 'source_templates'];
        keysToRemove.forEach((k) => delete next[k]);
        if (scope) {
          Object.assign(next, scope);
        }
        return next;
      },
      replace: true,
    } as any);
  }, [navigate]);

  const [draftColumns, setDraftColumns] = React.useState<TaskReportSelectedColumn[]>([]);

  // Track the result of the last run
  const [reportResult, setReportResult] = React.useState<TaskReportResult | null>(null);

  return {
    view,
    setView,
    activeDefinitionId,
    setActiveDefinitionId,
    draftScope,
    setDraftScope,
    draftColumns,
    setDraftColumns,
    reportResult,
    setReportResult,
  };
}
