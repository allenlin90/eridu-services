import { violationColumns } from '../columns';
import { ShowRunReviewTabPanel } from '../show-run-review-tab-panel';
import type { UseShowRunSummaryResult } from '../use-show-run-summary';

import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';

export function ViolationsTabPanel({ vm }: { vm: UseShowRunSummaryResult }) {
  const { query } = vm.violations;
  return (
    <ShowRunReviewTabPanel
      searchPlaceholder="Search platforms, shows, or details..."
      searchValue={vm.violations.searchValue}
      onSearchChange={vm.violations.onSearchChange}
      filterPlaceholder="All Severities"
      filterValue={vm.violations.filterValue}
      onFilterChange={vm.violations.onFilterChange}
      filterOptions={[
        { value: 'ALL', label: 'All Severities' },
        { value: 'CRITICAL', label: 'CRITICAL' },
        { value: 'HIGH', label: 'HIGH' },
        { value: 'MEDIUM', label: 'MEDIUM' },
        { value: 'LOW', label: 'LOW' },
        { value: 'WARNING', label: 'WARNING' },
      ]}
      columns={violationColumns}
      rows={query.data?.data ?? []}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      errorMessage={query.isError ? getShowRunReviewErrorMessage(query.error, 'Failed to load stream violations.') : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="No active platform stream lag, offline, or configuration violations reported."
      page={vm.violations.page}
      total={query.data?.meta.total ?? 0}
      pageCount={query.data?.meta.totalPages ?? 0}
      onPaginationChange={vm.violations.onPaginationChange}
      isExporting={vm.exportingTab === 'violations'}
      onExport={vm.violations.onExport}
    />
  );
}
