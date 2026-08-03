import { issueColumns } from '../columns';
import { ShowRunReviewTabPanel } from '../show-run-review-tab-panel';
import type { UseShowRunSummaryResult } from '../use-show-run-summary';

import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';

export function IssuesTabPanel({ vm }: { vm: UseShowRunSummaryResult }) {
  const { query } = vm.issues;
  return (
    <ShowRunReviewTabPanel
      searchPlaceholder="Search issue titles..."
      searchValue={vm.issues.searchValue}
      onSearchChange={vm.issues.onSearchChange}
      filterPlaceholder="All Severities"
      filterValue={vm.issues.filterValue}
      onFilterChange={vm.issues.onFilterChange}
      filterOptions={[
        { value: 'ALL', label: 'All Severities' },
        { value: 'CRITICAL', label: 'CRITICAL' },
        { value: 'HIGH', label: 'HIGH' },
        { value: 'MEDIUM', label: 'MEDIUM' },
        { value: 'LOW', label: 'LOW' },
      ]}
      columns={issueColumns}
      rows={query.data?.data ?? []}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      errorMessage={query.isError ? getShowRunReviewErrorMessage(query.error, 'Failed to load show issues.') : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="No unresolved show issues recorded for this day range."
      page={vm.issues.page}
      total={query.data?.meta.total ?? 0}
      pageCount={query.data?.meta.totalPages ?? 0}
      onPaginationChange={vm.issues.onPaginationChange}
      isExporting={vm.exportingTab === 'issues'}
      onExport={vm.issues.onExport}
    />
  );
}
