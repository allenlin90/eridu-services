import type { PaginationState, Updater } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

import { SHOW_RUN_REVIEW_PAGE_SIZE } from './constants';
import type { ShowRunTab } from './show-run-tab-nav';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';
import { getShowRunReviewErrorMessage } from '@/features/show-run-review/lib/get-show-run-review-error-message';
import {
  exportShowRunReviewCreators,
  exportShowRunReviewShows,
  exportShowRunReviewTasks,
  exportShowRunReviewViolations,
  type ShowRunReviewExportTab,
} from '@/features/show-run-review/lib/show-run-review-csv';
import type { GetShowRunReviewPaginatedParams } from '@/features/shows/api/get-show-run-review-paginated';
import {
  getShowRunReviewCreators,
  getShowRunReviewShows,
  getShowRunReviewTasks,
  getShowRunReviewViolations,
  useShowRunReviewCreatorsQuery,
  useShowRunReviewShowsQuery,
  useShowRunReviewTasksQuery,
  useShowRunReviewViolationsQuery,
} from '@/features/shows/api/get-show-run-review-paginated';

type UseShowRunSummaryInput = {
  data: ShowRunReviewSummary;
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: Partial<ShowRunReviewSearch>) => void;
  studioId: string;
};

type PageKey = 'creators_page' | 'violations_page' | 'tasks_page' | 'shows_page';

/**
 * View model for the Show Run Review summary surface: owns the four lazy
 * sub-resource queries, the per-tab search/filter/pagination handlers, and the
 * "export the full filtered set" workflow. Presentation lives in
 * `ShowRunSummary` and the tab-panel components.
 */
export function useShowRunSummary({ data, search, onSearchChange, studioId }: UseShowRunSummaryInput) {
  const activeTab: ShowRunTab = search.tab ?? 'creators';

  const setActiveTab = (tab: ShowRunTab) => {
    onSearchChange({
      tab,
      // Clear filters of other tabs to keep URL clean on tab changes
      creators_search: undefined,
      creators_status: undefined,
      creators_page: undefined,
      violations_search: undefined,
      violations_severity: undefined,
      violations_page: undefined,
      tasks_search: undefined,
      tasks_status: undefined,
      tasks_page: undefined,
      shows_search: undefined,
      shows_completeness: undefined,
      shows_page: undefined,
    });
  };

  // Lazy sub-resource queries — each only fetches while its tab is active.
  const creatorsQuery = useShowRunReviewCreatorsQuery(
    studioId,
    {
      date_from: data.date_from,
      date_to: data.date_to,
      page: search.creators_page ?? 1,
      limit: SHOW_RUN_REVIEW_PAGE_SIZE,
      search: search.creators_search,
      status: search.creators_status,
    },
    activeTab === 'creators',
  );

  const violationsQuery = useShowRunReviewViolationsQuery(
    studioId,
    {
      date_from: data.date_from,
      date_to: data.date_to,
      page: search.violations_page ?? 1,
      limit: SHOW_RUN_REVIEW_PAGE_SIZE,
      search: search.violations_search,
      severity: search.violations_severity,
    },
    activeTab === 'violations',
  );

  const tasksQuery = useShowRunReviewTasksQuery(
    studioId,
    {
      date_from: data.date_from,
      date_to: data.date_to,
      page: search.tasks_page ?? 1,
      limit: SHOW_RUN_REVIEW_PAGE_SIZE,
      search: search.tasks_search,
      status: search.tasks_status,
    },
    activeTab === 'tasks',
  );

  const showsQuery = useShowRunReviewShowsQuery(
    studioId,
    {
      date_from: data.date_from,
      date_to: data.date_to,
      page: search.shows_page ?? 1,
      limit: SHOW_RUN_REVIEW_PAGE_SIZE,
      search: search.shows_search,
      completeness: search.shows_completeness,
    },
    activeTab === 'shows',
  );

  const createPaginationChangeHandler = (pageKey: PageKey) =>
    (updater: Updater<PaginationState>) => {
      const currentPage = search[pageKey] ?? 1;
      const currentState: PaginationState = { pageIndex: currentPage - 1, pageSize: SHOW_RUN_REVIEW_PAGE_SIZE };
      const nextState = typeof updater === 'function' ? updater(currentState) : updater;
      onSearchChange({ [pageKey]: nextState.pageIndex + 1 });
    };

  const creatorsPaginationChange = createPaginationChangeHandler('creators_page');
  const violationsPaginationChange = createPaginationChangeHandler('violations_page');
  const tasksPaginationChange = createPaginationChangeHandler('tasks_page');
  const showsPaginationChange = createPaginationChangeHandler('shows_page');

  // Search / filter change handlers — each resets its tab's page to 1.
  const onCreatorsSearchChange = (val: string | undefined) =>
    onSearchChange({ creators_search: val, creators_page: 1 });
  const onCreatorsStatusChange = (val: string | undefined) =>
    onSearchChange({ creators_status: val as ShowRunReviewSearch['creators_status'], creators_page: 1 });

  const onViolationsSearchChange = (val: string | undefined) =>
    onSearchChange({ violations_search: val, violations_page: 1 });
  const onViolationsSeverityChange = (val: string | undefined) =>
    onSearchChange({ violations_severity: val, violations_page: 1 });

  const onTasksSearchChange = (val: string | undefined) =>
    onSearchChange({ tasks_search: val, tasks_page: 1 });
  const onTasksStatusChange = (val: string | undefined) =>
    onSearchChange({ tasks_status: val, tasks_page: 1 });

  const onShowsSearchChange = (val: string | undefined) =>
    onSearchChange({ shows_search: val, shows_page: 1 });
  const onShowsCompletenessChange = (val: string | undefined) =>
    onSearchChange({ shows_completeness: val, shows_page: 1 });

  // Export the FULL filtered set for a tab (not the current page): refetch the
  // same endpoint with the active filters and limit = total, then serialize.
  const [exportingTab, setExportingTab] = useState<ShowRunReviewExportTab | null>(null);

  // `total` is read from the cached list query, so a snapshot taken just before
  // export. If rows changed since the last list fetch the export caps at that
  // older total — acceptable for an operational snapshot, not a fix to chase.
  const runTabExport = async <TRow>(
    tab: ShowRunReviewExportTab,
    total: number,
    filters: Pick<GetShowRunReviewPaginatedParams, 'search' | 'status' | 'severity' | 'completeness'>,
    fetcher: (studioId: string, params: GetShowRunReviewPaginatedParams) => Promise<{ data: TRow[] }>,
    exporter: (rows: TRow[], opts: { dateFrom: string; dateTo: string }) => void,
  ): Promise<void> => {
    if (total === 0) {
      return;
    }
    setExportingTab(tab);
    try {
      const all = await fetcher(studioId, {
        date_from: data.date_from,
        date_to: data.date_to,
        page: 1,
        limit: total,
        ...filters,
      });
      exporter(all.data, { dateFrom: data.date_from, dateTo: data.date_to });
    } catch (err) {
      toast.error(getShowRunReviewErrorMessage(err, 'Failed to export CSV'));
    } finally {
      setExportingTab(null);
    }
  };

  const handleExportCreators = () =>
    runTabExport(
      'creators',
      creatorsQuery.data?.meta.total ?? 0,
      { search: search.creators_search, status: search.creators_status },
      getShowRunReviewCreators,
      exportShowRunReviewCreators,
    );

  const handleExportViolations = () =>
    runTabExport(
      'violations',
      violationsQuery.data?.meta.total ?? 0,
      { search: search.violations_search, severity: search.violations_severity },
      getShowRunReviewViolations,
      exportShowRunReviewViolations,
    );

  const handleExportTasks = () =>
    runTabExport(
      'tasks',
      tasksQuery.data?.meta.total ?? 0,
      { search: search.tasks_search, status: search.tasks_status },
      getShowRunReviewTasks,
      exportShowRunReviewTasks,
    );

  const handleExportShows = () =>
    runTabExport(
      'shows',
      showsQuery.data?.meta.total ?? 0,
      { search: search.shows_search, completeness: search.shows_completeness },
      getShowRunReviewShows,
      exportShowRunReviewShows,
    );

  return {
    activeTab,
    setActiveTab,
    exportingTab,
    creators: {
      query: creatorsQuery,
      page: search.creators_page ?? 1,
      searchValue: search.creators_search,
      filterValue: search.creators_status,
      onSearchChange: onCreatorsSearchChange,
      onFilterChange: onCreatorsStatusChange,
      onPaginationChange: creatorsPaginationChange,
      onExport: handleExportCreators,
    },
    violations: {
      query: violationsQuery,
      page: search.violations_page ?? 1,
      searchValue: search.violations_search,
      filterValue: search.violations_severity,
      onSearchChange: onViolationsSearchChange,
      onFilterChange: onViolationsSeverityChange,
      onPaginationChange: violationsPaginationChange,
      onExport: handleExportViolations,
    },
    tasks: {
      query: tasksQuery,
      page: search.tasks_page ?? 1,
      searchValue: search.tasks_search,
      filterValue: search.tasks_status,
      onSearchChange: onTasksSearchChange,
      onFilterChange: onTasksStatusChange,
      onPaginationChange: tasksPaginationChange,
      onExport: handleExportTasks,
    },
    shows: {
      query: showsQuery,
      page: search.shows_page ?? 1,
      searchValue: search.shows_search,
      filterValue: search.shows_completeness,
      onSearchChange: onShowsSearchChange,
      onFilterChange: onShowsCompletenessChange,
      onPaginationChange: showsPaginationChange,
      onExport: handleExportShows,
    },
  };
}
