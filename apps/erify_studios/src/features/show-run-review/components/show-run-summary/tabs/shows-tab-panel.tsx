import { showColumns } from '../columns';
import { ShowRunReviewTabPanel } from '../show-run-review-tab-panel';
import type { UseShowRunSummaryResult } from '../use-show-run-summary';

import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';

export function ShowsTabPanel({ vm }: { vm: UseShowRunSummaryResult }) {
  const { query } = vm.shows;
  return (
    <ShowRunReviewTabPanel
      searchPlaceholder="Search shows or completeness..."
      searchValue={vm.shows.searchValue}
      onSearchChange={vm.shows.onSearchChange}
      filterPlaceholder="All States"
      filterValue={vm.shows.filterValue}
      onFilterChange={vm.shows.onFilterChange}
      filterOptions={[
        { value: 'ALL', label: 'All States' },
        { value: 'ALL STARTED', label: 'ALL STARTED' },
        { value: 'MISSING STARTS', label: 'MISSING STARTS' },
      ]}
      columns={showColumns}
      rows={query.data?.data ?? []}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      errorMessage={query.isError ? getShowRunReviewErrorMessage(query.error, 'Failed to load the shows range.') : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="No shows scheduled in the selected date range."
      page={vm.shows.page}
      total={query.data?.meta.total ?? 0}
      pageCount={query.data?.meta.totalPages ?? 0}
      onPaginationChange={vm.shows.onPaginationChange}
      isExporting={vm.exportingTab === 'shows'}
      onExport={vm.shows.onExport}
    />
  );
}
