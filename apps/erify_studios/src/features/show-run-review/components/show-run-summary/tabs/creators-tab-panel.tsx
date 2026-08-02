import { creatorColumns } from '../columns';
import { ShowRunReviewTabPanel } from '../show-run-review-tab-panel';
import type { UseShowRunSummaryResult } from '../use-show-run-summary';

import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';

export function CreatorsTabPanel({ vm }: { vm: UseShowRunSummaryResult }) {
  const { query } = vm.creators;
  return (
    <ShowRunReviewTabPanel
      searchPlaceholder="Search creators, shows, or reasons..."
      searchValue={vm.creators.searchValue}
      onSearchChange={vm.creators.onSearchChange}
      filterPlaceholder="All Exceptions"
      filterValue={vm.creators.filterValue}
      onFilterChange={vm.creators.onFilterChange}
      filterOptions={[
        { value: 'ALL', label: 'All Exceptions' },
        { value: 'LATE', label: 'Late Arrival' },
        { value: 'MISSING', label: 'Missing Attendance' },
      ]}
      columns={creatorColumns}
      rows={query.data?.data ?? []}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      errorMessage={query.isError ? getShowRunReviewErrorMessage(query.error, 'Failed to load creator exceptions.') : undefined}
      onRetry={() => void query.refetch()}
      emptyMessage="No creator lateness exceptions or missing attendance flags recorded for this day range."
      page={vm.creators.page}
      total={query.data?.meta.total ?? 0}
      pageCount={query.data?.meta.totalPages ?? 0}
      onPaginationChange={vm.creators.onPaginationChange}
      isExporting={vm.exportingTab === 'creators'}
      onExport={vm.creators.onExport}
    />
  );
}
