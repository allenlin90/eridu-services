import { Loader2 } from 'lucide-react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import {
  creatorColumns,
  showColumns,
  taskColumns,
  violationColumns,
} from './show-run-summary/columns';
import { ShowRunMetricCards } from './show-run-summary/show-run-metric-cards';
import { ShowRunReviewTabPanel } from './show-run-summary/show-run-review-tab-panel';
import { ShowRunTabNav } from './show-run-summary/show-run-tab-nav';
import { useShowRunSummary } from './show-run-summary/use-show-run-summary';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';

type ShowRunSummaryProps = {
  data: ShowRunReviewSummary;
  isFetching?: boolean;
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: Partial<ShowRunReviewSearch>) => void;
  studioId: string;
};

export function ShowRunSummary({ data, isFetching = false, search, onSearchChange, studioId }: ShowRunSummaryProps) {
  const vm = useShowRunSummary({ data, search, onSearchChange, studioId });

  return (
    <div className="space-y-6 min-w-0 w-full overflow-hidden">
      {/* Background Refetch Banner */}
      {isFetching && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-700 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Refreshing operational facts in background...</span>
        </div>
      )}

      <ShowRunMetricCards data={data} />

      {/* Tab Panel Navigation */}
      <Card className="border border-border/80 shadow-sm min-w-0 w-full overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Run Exception Logs</CardTitle>
            <CardDescription className="whitespace-normal break-words">
              Detailed overview of operational alerts and discrepancies.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 min-w-0 w-full overflow-hidden space-y-6">
          <ShowRunTabNav activeTab={vm.activeTab} onTabChange={vm.setActiveTab} data={data} />

          {vm.activeTab === 'creators' && (
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
              rows={vm.creators.query.data?.data ?? []}
              isLoading={vm.creators.query.isLoading}
              isFetching={vm.creators.query.isFetching}
              emptyMessage="No creator lateness exceptions or missing attendance flags recorded for this day range."
              page={vm.creators.page}
              total={vm.creators.query.data?.meta.total ?? 0}
              pageCount={vm.creators.query.data?.meta.totalPages ?? 0}
              onPaginationChange={vm.creators.onPaginationChange}
              isExporting={vm.exportingTab === 'creators'}
              onExport={vm.creators.onExport}
            />
          )}

          {vm.activeTab === 'violations' && (
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
              rows={vm.violations.query.data?.data ?? []}
              isLoading={vm.violations.query.isLoading}
              isFetching={vm.violations.query.isFetching}
              emptyMessage="No active platform stream lag, offline, or configuration violations reported."
              page={vm.violations.page}
              total={vm.violations.query.data?.meta.total ?? 0}
              pageCount={vm.violations.query.data?.meta.totalPages ?? 0}
              onPaginationChange={vm.violations.onPaginationChange}
              isExporting={vm.exportingTab === 'violations'}
              onExport={vm.violations.onExport}
            />
          )}

          {vm.activeTab === 'tasks' && (
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
              rows={vm.tasks.query.data?.data ?? []}
              isLoading={vm.tasks.query.isLoading}
              isFetching={vm.tasks.query.isFetching}
              emptyMessage="Every task, pre-production check, on-air, and post-production template task has been completed!"
              page={vm.tasks.page}
              total={vm.tasks.query.data?.meta.total ?? 0}
              pageCount={vm.tasks.query.data?.meta.totalPages ?? 0}
              onPaginationChange={vm.tasks.onPaginationChange}
              isExporting={vm.exportingTab === 'tasks'}
              onExport={vm.tasks.onExport}
            />
          )}

          {vm.activeTab === 'shows' && (
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
              rows={vm.shows.query.data?.data ?? []}
              isLoading={vm.shows.query.isLoading}
              isFetching={vm.shows.query.isFetching}
              emptyMessage="No shows scheduled in the selected date range."
              page={vm.shows.page}
              total={vm.shows.query.data?.meta.total ?? 0}
              pageCount={vm.shows.query.data?.meta.totalPages ?? 0}
              onPaginationChange={vm.shows.onPaginationChange}
              isExporting={vm.exportingTab === 'shows'}
              onExport={vm.shows.onExport}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
