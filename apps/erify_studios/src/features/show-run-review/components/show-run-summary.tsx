import { Loader2 } from 'lucide-react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { ShowRunMetricCards } from './show-run-summary/show-run-metric-cards';
import { ShowRunTabNav } from './show-run-summary/show-run-tab-nav';
import { CreatorsTabPanel } from './show-run-summary/tabs/creators-tab-panel';
import { IssuesTabPanel } from './show-run-summary/tabs/issues-tab-panel';
import { ShowsTabPanel } from './show-run-summary/tabs/shows-tab-panel';
import { TasksTabPanel } from './show-run-summary/tabs/tasks-tab-panel';
import { ViolationsTabPanel } from './show-run-summary/tabs/violations-tab-panel';
import { useShowRunSummary } from './show-run-summary/use-show-run-summary';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';

type ShowRunSummaryProps = {
  data: ShowRunReviewSummary;
  isFetching?: boolean;
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: Partial<ShowRunReviewSearch>) => void;
  studioId: string;
};

/**
 * Top-level Show Run Review surface: metric cards, tab navigation, and the
 * active tab's panel. Each tab's own search/filter/column/copy differs, so
 * rendering lives in a dedicated component per tab under `show-run-summary/
 * tabs/` — all five consume the same `useShowRunSummary` view model and the
 * same shared `ShowRunReviewTabPanel` shell.
 */
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

          {vm.activeTab === 'creators' && <CreatorsTabPanel vm={vm} />}
          {vm.activeTab === 'violations' && <ViolationsTabPanel vm={vm} />}
          {vm.activeTab === 'tasks' && <TasksTabPanel vm={vm} />}
          {vm.activeTab === 'shows' && <ShowsTabPanel vm={vm} />}
          {vm.activeTab === 'issues' && <IssuesTabPanel vm={vm} />}
        </CardContent>
      </Card>
    </div>
  );
}
