import { taskColumns } from '../columns';
import { ShowRunReviewTabPanel } from '../show-run-review-tab-panel';
import type { UseShowRunSummaryResult } from '../use-show-run-summary';

import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';

export function TasksTabPanel({ vm }: { vm: UseShowRunSummaryResult }) {
  const { query } = vm.tasks;
  return (
    <ShowRunReviewTabPanel
      searchPlaceholder="Search tasks or associated shows..."
      searchValue={vm.tasks.searchValue}
      onSearchChange={vm.tasks.onSearchChange}
      filterPlaceholder="All Statuses"
      filterValue={vm.tasks.filterValue}
      onFilterChange={vm.tasks.onFilterChange}
      filterOptions={[
        { value: 'ALL', label: 'All Statuses' },
        { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
        { value: 'TODO', label: 'TODO' },
        { value: 'FAILED', label: 'FAILED' },
      ]}
      columns={taskColumns}
      rows={query.data?.data ?? []}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      errorMessage={query.isError ? getShowRunReviewErrorMessage(query.error, 'Failed to load incomplete tasks.') : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="Every task, pre-production check, on-air, and post-production template task has been completed!"
      page={vm.tasks.page}
      total={query.data?.meta.total ?? 0}
      pageCount={query.data?.meta.totalPages ?? 0}
      onPaginationChange={vm.tasks.onPaginationChange}
      isExporting={vm.exportingTab === 'tasks'}
      onExport={vm.tasks.onExport}
    />
  );
}
