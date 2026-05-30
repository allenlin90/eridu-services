import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarDays,
  Clock,
  ListTodo,
  Loader2,
  MonitorX,
  Users2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';
import {
  exportShowRunReviewCreators,
  exportShowRunReviewShows,
  exportShowRunReviewTasks,
  exportShowRunReviewViolations,
  type ShowRunReviewExportTab,
} from '@/features/show-run-review/lib/show-run-review-csv';
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

type ShowRunSummaryProps = {
  data: ShowRunReviewSummary;
  isFetching?: boolean;
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: Partial<ShowRunReviewSearch>) => void;
  studioId: string;
};

type CreatorException = ShowRunReviewSummary['creators']['exceptions'][number];
type PlatformViolation = ShowRunReviewSummary['platforms']['violations'][number];
type IncompleteTask = ShowRunReviewSummary['tasks']['incomplete_tasks'][number];

type ShowsSummaryRow = {
  id: string;
  shows_range: string;
  actuals_completeness: string;
  status: string;
};

function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '0m';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

// Creator exception logs columns definition
const creatorColumns: ColumnDef<CreatorException>[] = [
  {
    accessorKey: 'creator_name',
    header: 'Creator Name',
    cell: ({ row }) => <span className="font-semibold text-sm">{row.original.creator_name}</span>,
  },
  {
    accessorKey: 'show_name',
    header: 'Show Name',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => (
      <div className="space-y-0.5 whitespace-normal break-words">
        <div className="font-medium text-xs">{row.original.show_name}</div>
        <div className="text-[10px] text-muted-foreground">
          Start:
          {' '}
          {new Date(row.original.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return status === 'MISSING'
        ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
              <XCircle className="h-3 w-3" />
              {' '}
              Missing
            </span>
          )
        : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              <Clock className="h-3 w-3" />
              {' '}
              Late Arrival
            </span>
          );
    },
  },
  {
    accessorKey: 'late_minutes',
    header: 'Exception Details',
    cell: ({ row }) => {
      const status = row.original.status;
      const lateMinutes = row.original.late_minutes;
      return status === 'LATE'
        ? (
            <span className="text-xs font-semibold text-amber-800">
              {lateMinutes}
              {' '}
              minutes late
            </span>
          )
        : (
            <span className="text-xs text-muted-foreground">—</span>
          );
    },
  },
  {
    accessorKey: 'reason',
    header: 'Operator\'s Note / Reason',
    meta: { className: 'whitespace-normal break-words min-w-[180px] max-w-[280px]' },
    cell: ({ row }) => {
      const reason = row.original.reason;
      return reason
        ? (
            <span className="not-italic text-xs text-foreground bg-muted/40 rounded px-2 py-1 border block whitespace-normal break-words">
              {reason}
            </span>
          )
        : (
            <span className="text-xs italic text-muted-foreground">No reason specified</span>
          );
    },
  },
];

// Platform violation columns definition
const violationColumns: ColumnDef<PlatformViolation>[] = [
  {
    accessorKey: 'platform_name',
    header: 'Platform',
    cell: ({ row }) => <span className="font-semibold text-sm">{row.original.platform_name}</span>,
  },
  {
    accessorKey: 'show_name',
    header: 'Show Name',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => (
      <div className="space-y-0.5 whitespace-normal break-words">
        <div className="font-medium text-xs">{row.original.show_name}</div>
        <div className="text-[10px] text-muted-foreground">
          Start:
          {' '}
          {new Date(row.original.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'violation_type',
    header: 'Violation Type',
    cell: ({ row }) => <span className="font-medium text-xs text-rose-700">{row.original.violation_type}</span>,
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.original.severity;
      if (severity === 'CRITICAL') {
        return (
          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
            CRITICAL
          </span>
        );
      }
      if (severity === 'HIGH') {
        return (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
            HIGH
          </span>
        );
      }
      if (severity === 'MEDIUM') {
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            MEDIUM
          </span>
        );
      }
      if (severity === 'LOW') {
        return (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
            LOW
          </span>
        );
      }
      if (severity === 'WARNING') {
        return (
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 border border-yellow-200">
            WARNING
          </span>
        );
      }
      return (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
          {severity}
        </span>
      );
    },
  },
  {
    accessorKey: 'reason',
    header: 'Reason / Details',
    meta: { className: 'whitespace-normal break-words min-w-[180px] max-w-[280px]' },
    cell: ({ row }) => <span className="text-xs block whitespace-normal break-words">{row.original.reason}</span>,
  },
  {
    accessorKey: 'observed_at',
    header: 'Observed At',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.observed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    ),
  },
];

// Incomplete tasks columns definition
const taskColumns: ColumnDef<IncompleteTask>[] = [
  {
    accessorKey: 'description',
    header: 'Task Description',
    meta: { className: 'whitespace-normal break-words min-w-[200px]' },
    cell: ({ row }) => <span className="font-medium text-sm whitespace-normal break-words">{row.original.description}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Phase / Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] font-medium border-purple-200 bg-purple-50 text-purple-700 uppercase">
        {row.original.type.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border">
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'show_name',
    header: 'Associated Show',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="text-xs font-semibold text-indigo-700 whitespace-normal break-words">{row.original.show_name}</span>,
  },
];

// Shows range summary columns definition
const showColumns: ColumnDef<ShowsSummaryRow>[] = [
  {
    accessorKey: 'shows_range',
    header: 'Shows Range Summary',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="font-semibold text-sm whitespace-normal break-words">{row.original.shows_range}</span>,
  },
  {
    accessorKey: 'actuals_completeness',
    header: 'Actuals Completeness',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="text-xs whitespace-normal break-words">{row.original.actuals_completeness}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status Check',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'ALL STARTED' ? 'outline' : 'destructive'}
          className={status === 'ALL STARTED' ? 'border-green-200 bg-green-50 text-green-700 font-normal' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
];

export function ShowRunSummary({ data, isFetching = false, search, onSearchChange, studioId }: ShowRunSummaryProps) {
  const activeTab = search.tab ?? 'creators';
  const setActiveTab = (tab: string) => {
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

  const showStats = data.shows;
  const creatorStats = data.creators;
  const platformStats = data.platforms;
  const taskStats = data.tasks;

  const startedPercentage = showStats.total_count > 0
    ? Math.round((showStats.started_count / showStats.total_count) * 100)
    : 0;

  // React Query lazy loaded sub-resources
  const creatorsQuery = useShowRunReviewCreatorsQuery(
    studioId,
    {
      date_from: data.date_from,
      date_to: data.date_to,
      page: search.creators_page ?? 1,
      limit: 10,
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
      limit: 10,
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
      limit: 10,
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
      limit: 10,
      search: search.shows_search,
      completeness: search.shows_completeness,
    },
    activeTab === 'shows',
  );

  // Pagination Change Handlers
  const createPaginationChangeHandler = (tab: 'creators' | 'violations' | 'tasks' | 'shows') => {
    const pageKey = `${tab}_page` as const;
    return (updater: any) => {
      const currentPage = search[pageKey] ?? 1;
      const nextVal = typeof updater === 'function'
        ? updater({ pageIndex: currentPage - 1, pageSize: 10 })
        : updater;
      onSearchChange({ [pageKey]: nextVal.pageIndex + 1 });
    };
  };

  const creatorsPaginationChange = createPaginationChangeHandler('creators');
  const violationsPaginationChange = createPaginationChangeHandler('violations');
  const tasksPaginationChange = createPaginationChangeHandler('tasks');
  const showsPaginationChange = createPaginationChangeHandler('shows');

  // Search/Filter Reset Helpers (resets page back to 1)
  const onCreatorsSearchChange = (val: string | undefined) => {
    onSearchChange({ creators_search: val, creators_page: 1 });
  };
  const onCreatorsStatusChange = (val: string | undefined) => {
    onSearchChange({ creators_status: val as any, creators_page: 1 });
  };

  const onViolationsSearchChange = (val: string | undefined) => {
    onSearchChange({ violations_search: val, violations_page: 1 });
  };
  const onViolationsSeverityChange = (val: string | undefined) => {
    onSearchChange({ violations_severity: val, violations_page: 1 });
  };

  const onTasksSearchChange = (val: string | undefined) => {
    onSearchChange({ tasks_search: val, tasks_page: 1 });
  };
  const onTasksStatusChange = (val: string | undefined) => {
    onSearchChange({ tasks_status: val, tasks_page: 1 });
  };

  const onShowsSearchChange = (val: string | undefined) => {
    onSearchChange({ shows_search: val, shows_page: 1 });
  };
  const onShowsCompletenessChange = (val: string | undefined) => {
    onSearchChange({ shows_completeness: val, shows_page: 1 });
  };

  // Export the FULL filtered set for a tab (not the current page): refetch the
  // same endpoint with the active filters and limit = total, then serialize.
  const [exportingTab, setExportingTab] = useState<ShowRunReviewExportTab | null>(null);

  const handleExportCreators = async () => {
    const total = creatorsQuery.data?.meta.total ?? 0;
    if (total === 0 || !search.date_from || !search.date_to) {
      return;
    }
    setExportingTab('creators');
    try {
      const all = await getShowRunReviewCreators(studioId, {
        date_from: search.date_from,
        date_to: search.date_to,
        page: 1,
        limit: total,
        search: search.creators_search,
        status: search.creators_status,
      });
      exportShowRunReviewCreators(all.data, { dateFrom: search.date_from, dateTo: search.date_to });
    } finally {
      setExportingTab(null);
    }
  };

  const handleExportViolations = async () => {
    const total = violationsQuery.data?.meta.total ?? 0;
    if (total === 0 || !search.date_from || !search.date_to) {
      return;
    }
    setExportingTab('violations');
    try {
      const all = await getShowRunReviewViolations(studioId, {
        date_from: search.date_from,
        date_to: search.date_to,
        page: 1,
        limit: total,
        search: search.violations_search,
        severity: search.violations_severity,
      });
      exportShowRunReviewViolations(all.data, { dateFrom: search.date_from, dateTo: search.date_to });
    } finally {
      setExportingTab(null);
    }
  };

  const handleExportTasks = async () => {
    const total = tasksQuery.data?.meta.total ?? 0;
    if (total === 0 || !search.date_from || !search.date_to) {
      return;
    }
    setExportingTab('tasks');
    try {
      const all = await getShowRunReviewTasks(studioId, {
        date_from: search.date_from,
        date_to: search.date_to,
        page: 1,
        limit: total,
        search: search.tasks_search,
        status: search.tasks_status,
      });
      exportShowRunReviewTasks(all.data, { dateFrom: search.date_from, dateTo: search.date_to });
    } finally {
      setExportingTab(null);
    }
  };

  const handleExportShows = async () => {
    const total = showsQuery.data?.meta.total ?? 0;
    if (total === 0 || !search.date_from || !search.date_to) {
      return;
    }
    setExportingTab('shows');
    try {
      const all = await getShowRunReviewShows(studioId, {
        date_from: search.date_from,
        date_to: search.date_to,
        page: 1,
        limit: total,
        search: search.shows_search,
        completeness: search.shows_completeness,
      });
      exportShowRunReviewShows(all.data, { dateFrom: search.date_from, dateTo: search.date_to });
    } finally {
      setExportingTab(null);
    }
  };

  return (
    <div className="space-y-6 min-w-0 w-full overflow-hidden">
      {/* Background Refetch Banner */}
      {isFetching && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-700 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Refreshing operational facts in background...</span>
        </div>
      )}

      {/* Grid of Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Shows Actuals Completeness Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Show Actuals
              </CardDescription>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {showStats.started_count}
              {' '}
              <span className="text-sm font-normal text-muted-foreground">
                /
                {showStats.total_count}
              </span>
              {' '}
              <span className="text-sm font-normal text-muted-foreground">started</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Started</span>
                <span className="font-semibold text-foreground">
                  {startedPercentage}
                  %
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${startedPercentage}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Late starts</span>
                <span className="font-semibold text-amber-700">{showStats.late_start_count}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Missing duration</span>
                <span className="font-semibold text-amber-700">{formatDurationMinutes(showStats.missing_duration_minutes)}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              {showStats.not_started_count}
              {' '}
              not started ·
              {' '}
              {showStats.end_recorded_count}
              /
              {showStats.total_count}
              {' '}
              end times recorded
            </p>
          </CardContent>
        </Card>

        {/* Creator Exceptions Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Creator Exceptions
              </CardDescription>
              <Users2 className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {creatorStats.late_count + creatorStats.missing_count}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Late arrivals</span>
              <span className="font-semibold text-amber-700">{creatorStats.late_count}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Missing attendance</span>
              <span className="font-semibold text-red-600">{creatorStats.missing_count}</span>
            </div>
            <p className="pt-2 text-[10px] text-muted-foreground border-t mt-2">
              Based on
              {' '}
              {creatorStats.total_count}
              {' '}
              total assignments
            </p>
          </CardContent>
        </Card>

        {/* Platform Stream Violations Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-rose-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stream Violations
              </CardDescription>
              <MonitorX className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-rose-600">
              {platformStats.active_violations_count}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Active platform stream alerts requiring manager confirmation.
            </p>
            <div className="pt-1">
              <Badge variant={platformStats.active_violations_count > 0 ? 'destructive' : 'secondary'} className="text-[10px] py-0 px-2 font-normal">
                {platformStats.active_violations_count > 0 ? 'Action Required' : 'Streams Clear'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Incomplete Phase Checks Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Incomplete Tasks
              </CardDescription>
              <ListTodo className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {taskStats.incomplete_phase_checks_count}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Unfinished pre-production, on-air, or post-production checkpoints.
            </p>
            <div className="pt-1">
              <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-purple-200 bg-purple-50 text-purple-700">
                Checklist Gates
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

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
          {/* Custom styled modern tabs inside CardContent */}
          <div className="flex w-full sm:w-auto min-w-0 overflow-x-auto scrollbar-none flex-nowrap items-center gap-1 rounded-lg bg-muted p-1 text-xs scroll-smooth">
            <button
              type="button"
              onClick={() => setActiveTab('creators')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all flex-shrink-0 ${
                activeTab === 'creators'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Creators</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === 'creators' ? 'bg-amber-100 text-amber-800' : 'bg-muted-foreground/20'
              }`}
              >
                {creatorStats.late_count + creatorStats.missing_count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('violations')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all flex-shrink-0 ${
                activeTab === 'violations'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Stream Alerts</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === 'violations' ? 'bg-rose-100 text-rose-800' : 'bg-muted-foreground/20'
              }`}
              >
                {platformStats.active_violations_count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all flex-shrink-0 ${
                activeTab === 'tasks'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Incomplete Tasks</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === 'tasks' ? 'bg-purple-100 text-purple-800' : 'bg-muted-foreground/20'
              }`}
              >
                {taskStats.incomplete_phase_checks_count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shows')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all flex-shrink-0 ${
                activeTab === 'shows'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Shows Range</span>
              <span className="rounded-full px-1.5 py-0.2 text-[10px] bg-muted-foreground/20">
                {showStats.total_count}
              </span>
            </button>
            <div className="w-4 flex-shrink-0" />
          </div>

          {/* Creators Tab */}
          {activeTab === 'creators' && (
            <div className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <Input
                    placeholder="Search creators, shows, or reasons..."
                    value={search.creators_search ?? ''}
                    onChange={(e) => onCreatorsSearchChange(e.target.value || undefined)}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.creators_status ?? 'ALL'}
                    onValueChange={(val) =>
                      onCreatorsStatusChange(val === 'ALL' ? undefined : val)}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Exceptions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Exceptions</SelectItem>
                      <SelectItem value="LATE">Late Arrival</SelectItem>
                      <SelectItem value="MISSING">Missing Attendance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCreators}
                  disabled={exportingTab === 'creators' || (creatorsQuery.data?.meta.total ?? 0) === 0}
                >
                  {exportingTab === 'creators' ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>

              <DataTable
                data={creatorsQuery.data?.data ?? []}
                columns={creatorColumns}
                isLoading={creatorsQuery.isLoading}
                isFetching={creatorsQuery.isFetching}
                emptyMessage="No creator lateness exceptions or missing attendance flags recorded for this day range."
                manualPagination
                pageCount={creatorsQuery.data?.meta.totalPages ?? 0}
                paginationState={{
                  pageIndex: (search.creators_page ?? 1) - 1,
                  pageSize: 10,
                }}
                onPaginationChange={creatorsPaginationChange}
                renderFooter={() => (
                  <DataTablePagination
                    pagination={{
                      pageIndex: (search.creators_page ?? 1) - 1,
                      pageSize: 10,
                      total: creatorsQuery.data?.meta.total ?? 0,
                      pageCount: creatorsQuery.data?.meta.totalPages ?? 0,
                    }}
                    onPaginationChange={creatorsPaginationChange}
                  />
                )}
              />
            </div>
          )}

          {/* Stream Alerts Tab */}
          {activeTab === 'violations' && (
            <div className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <Input
                    placeholder="Search platforms, shows, or details..."
                    value={search.violations_search ?? ''}
                    onChange={(e) => onViolationsSearchChange(e.target.value || undefined)}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.violations_severity ?? 'ALL'}
                    onValueChange={(val) =>
                      onViolationsSeverityChange(val === 'ALL' ? undefined : val)}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportViolations}
                  disabled={exportingTab === 'violations' || (violationsQuery.data?.meta.total ?? 0) === 0}
                >
                  {exportingTab === 'violations' ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>

              <DataTable
                data={violationsQuery.data?.data ?? []}
                columns={violationColumns}
                isLoading={violationsQuery.isLoading}
                isFetching={violationsQuery.isFetching}
                emptyMessage="No active platform stream lag, offline, or configuration violations reported."
                manualPagination
                pageCount={violationsQuery.data?.meta.totalPages ?? 0}
                paginationState={{
                  pageIndex: (search.violations_page ?? 1) - 1,
                  pageSize: 10,
                }}
                onPaginationChange={violationsPaginationChange}
                renderFooter={() => (
                  <DataTablePagination
                    pagination={{
                      pageIndex: (search.violations_page ?? 1) - 1,
                      pageSize: 10,
                      total: violationsQuery.data?.meta.total ?? 0,
                      pageCount: violationsQuery.data?.meta.totalPages ?? 0,
                    }}
                    onPaginationChange={violationsPaginationChange}
                  />
                )}
              />
            </div>
          )}

          {/* Incomplete Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <Input
                    placeholder="Search tasks or associated shows..."
                    value={search.tasks_search ?? ''}
                    onChange={(e) => onTasksSearchChange(e.target.value || undefined)}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.tasks_status ?? 'ALL'}
                    onValueChange={(val) =>
                      onTasksStatusChange(val === 'ALL' ? undefined : val)}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                      <SelectItem value="TODO">TODO</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTasks}
                  disabled={exportingTab === 'tasks' || (tasksQuery.data?.meta.total ?? 0) === 0}
                >
                  {exportingTab === 'tasks' ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>

              <DataTable
                data={tasksQuery.data?.data ?? []}
                columns={taskColumns}
                isLoading={tasksQuery.isLoading}
                isFetching={tasksQuery.isFetching}
                emptyMessage="Every task, pre-production check, on-air, and post-production template task has been completed!"
                manualPagination
                pageCount={tasksQuery.data?.meta.totalPages ?? 0}
                paginationState={{
                  pageIndex: (search.tasks_page ?? 1) - 1,
                  pageSize: 10,
                }}
                onPaginationChange={tasksPaginationChange}
                renderFooter={() => (
                  <DataTablePagination
                    pagination={{
                      pageIndex: (search.tasks_page ?? 1) - 1,
                      pageSize: 10,
                      total: tasksQuery.data?.meta.total ?? 0,
                      pageCount: tasksQuery.data?.meta.totalPages ?? 0,
                    }}
                    onPaginationChange={tasksPaginationChange}
                  />
                )}
              />
            </div>
          )}

          {/* Shows Range Tab */}
          {activeTab === 'shows' && (
            <div className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <Input
                    placeholder="Search shows or completeness..."
                    value={search.shows_search ?? ''}
                    onChange={(e) => onShowsSearchChange(e.target.value || undefined)}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.shows_completeness ?? 'ALL'}
                    onValueChange={(val) =>
                      onShowsCompletenessChange(val === 'ALL' ? undefined : val)}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All States</SelectItem>
                      <SelectItem value="ALL STARTED">ALL STARTED</SelectItem>
                      <SelectItem value="MISSING STARTS">MISSING STARTS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportShows}
                  disabled={exportingTab === 'shows' || (showsQuery.data?.meta.total ?? 0) === 0}
                >
                  {exportingTab === 'shows' ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>

              <DataTable
                data={showsQuery.data?.data ?? []}
                columns={showColumns}
                isLoading={showsQuery.isLoading}
                isFetching={showsQuery.isFetching}
                emptyMessage="No shows scheduled in the selected date range."
                manualPagination
                pageCount={showsQuery.data?.meta.totalPages ?? 0}
                paginationState={{
                  pageIndex: (search.shows_page ?? 1) - 1,
                  pageSize: 10,
                }}
                onPaginationChange={showsPaginationChange}
                renderFooter={() => (
                  <DataTablePagination
                    pagination={{
                      pageIndex: (search.shows_page ?? 1) - 1,
                      pageSize: 10,
                      total: showsQuery.data?.meta.total ?? 0,
                      pageCount: showsQuery.data?.meta.totalPages ?? 0,
                    }}
                    onPaginationChange={showsPaginationChange}
                  />
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
