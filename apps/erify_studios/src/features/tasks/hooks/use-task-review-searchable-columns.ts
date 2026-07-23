import type { ColumnFiltersState } from '@tanstack/react-table';
import { useMemo } from 'react';

import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { studioTaskSearchableColumns } from '@/features/tasks/config/studio-task-columns';
import { useTaskReviewClientFilter } from '@/features/tasks/hooks/use-task-review-client-filter';
import { useTaskReviewShowFilter } from '@/features/tasks/hooks/use-task-review-show-filter';
import { useTaskReviewUserFilter } from '@/features/tasks/hooks/use-task-review-user-filter';
import * as m from '@/paraglide/messages';

function getSelectedValue(filters: ColumnFiltersState, id: string): string | undefined {
  const value = filters.find((filter) => filter.id === id)?.value;
  return typeof value === 'string' && value ? value : undefined;
}

/** Composes async task-review filters while preserving selected labels across searches. */
export function useTaskReviewSearchableColumns(studioId: string, columnFilters: ColumnFiltersState) {
  const selectedClientId = getSelectedValue(columnFilters, 'client_id');
  const selectedAssigneeName = getSelectedValue(columnFilters, 'assignee_name');
  const selectedShowName = getSelectedValue(columnFilters, 'show_name');
  const clientFilter = useTaskReviewClientFilter(studioId, selectedClientId);
  const assigneeFilter = useTaskReviewUserFilter(studioId, selectedAssigneeName);
  const showFilter = useTaskReviewShowFilter(studioId, selectedShowName);
  const { data: showLookups } = useShowLookupsQuery(studioId);
  const platformOptions = useMemo(
    () => (showLookups?.platforms ?? []).map((platform) => ({ value: platform.id, label: platform.name })),
    [showLookups?.platforms],
  );

  return useMemo(() => studioTaskSearchableColumns.map((column) => {
    if (column.id === 'client_id') {
      return {
        ...column,
        type: 'combobox' as const,
        options: clientFilter.options,
        onSearch: clientFilter.setSearch,
        isLoading: clientFilter.isLoading,
        placeholder: m.task_review_qc_filter_client(),
      };
    }
    if (column.id === 'platform_id') {
      return { ...column, options: platformOptions, placeholder: m.task_review_qc_filter_platform() };
    }
    if (column.id === 'assignee_name') {
      return {
        ...column,
        type: 'combobox' as const,
        options: assigneeFilter.options,
        onSearch: assigneeFilter.setSearch,
        isLoading: assigneeFilter.isLoading,
        placeholder: m.task_review_qc_filter_user(),
      };
    }
    if (column.id === 'show_name') {
      return {
        ...column,
        type: 'combobox' as const,
        options: showFilter.options,
        onSearch: showFilter.setSearch,
        isLoading: showFilter.isLoading,
        placeholder: m.task_review_qc_filter_show(),
      };
    }
    return column;
  }), [assigneeFilter, clientFilter, platformOptions, showFilter]);
}
