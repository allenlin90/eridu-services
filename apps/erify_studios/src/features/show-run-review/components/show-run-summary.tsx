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
import { useMemo } from 'react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

type ShowRunSummaryProps = {
  data: ShowRunReviewSummary;
  isFetching?: boolean;
  search: any;
  onSearchChange: (nextSearch: any) => void;
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
    cell: ({ row }) => (
      <div className="space-y-0.5">
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
    cell: ({ row }) => {
      const reason = row.original.reason;
      return reason
        ? (
            <span className="not-italic text-xs text-foreground bg-muted/40 rounded px-2 py-1 border block max-w-xs truncate" title={reason}>
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
    cell: ({ row }) => (
      <div className="space-y-0.5">
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
    cell: ({ row }) => <span className="text-xs max-w-sm block truncate" title={row.original.reason}>{row.original.reason}</span>,
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
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.description}</span>,
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
    cell: ({ row }) => <span className="text-xs font-semibold text-indigo-700">{row.original.show_name}</span>,
  },
];

// Shows range summary columns definition
const showColumns: ColumnDef<ShowsSummaryRow>[] = [
  {
    accessorKey: 'shows_range',
    header: 'Shows Range Summary',
    cell: ({ row }) => <span className="font-semibold text-sm">{row.original.shows_range}</span>,
  },
  {
    accessorKey: 'actuals_completeness',
    header: 'Actuals Completeness',
    cell: ({ row }) => <span className="text-xs">{row.original.actuals_completeness}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status Check',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'ALL COMPLETE' ? 'outline' : 'destructive'}
          className={status === 'ALL COMPLETE' ? 'border-green-200 bg-green-50 text-green-700 font-normal' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
];

export function ShowRunSummary({ data, isFetching = false, search, onSearchChange }: ShowRunSummaryProps) {
  const activeTab = search.tab ?? 'creators';
  const setActiveTab = (tab: string) => {
    onSearchChange({
      tab,
      // Clear filters of other tabs to keep URL clean on tab changes
      creators_search: undefined,
      creators_status: undefined,
      violations_search: undefined,
      violations_severity: undefined,
      tasks_search: undefined,
      tasks_status: undefined,
      shows_search: undefined,
      shows_completeness: undefined,
    });
  };

  const showStats = data.shows;
  const creatorStats = data.creators;
  const platformStats = data.platforms;
  const taskStats = data.tasks;

  const completenessPercentage = showStats.total_count > 0
    ? Math.round((showStats.complete_count / showStats.total_count) * 100)
    : 0;

  // Local filtered datasets mapped to URL search query parameters
  const filteredCreators = useMemo(() => {
    let list = creatorStats.exceptions;
    const query = search.creators_search?.toLowerCase();
    if (query) {
      list = list.filter(
        (ex) =>
          ex.creator_name.toLowerCase().includes(query)
          || ex.show_name.toLowerCase().includes(query)
          || ex.reason?.toLowerCase().includes(query),
      );
    }
    const status = search.creators_status;
    if (status) {
      list = list.filter((ex) => ex.status === status);
    }
    return list;
  }, [creatorStats.exceptions, search.creators_search, search.creators_status]);

  const filteredViolations = useMemo(() => {
    let list = platformStats.violations;
    const query = search.violations_search?.toLowerCase();
    if (query) {
      list = list.filter(
        (violation) =>
          violation.platform_name.toLowerCase().includes(query)
          || violation.show_name.toLowerCase().includes(query)
          || violation.reason.toLowerCase().includes(query)
          || violation.violation_type.toLowerCase().includes(query),
      );
    }
    const severity = search.violations_severity;
    if (severity) {
      list = list.filter((v) => v.severity === severity);
    }
    return list;
  }, [platformStats.violations, search.violations_search, search.violations_severity]);

  const filteredTasks = useMemo(() => {
    let list = taskStats.incomplete_tasks;
    const query = search.tasks_search?.toLowerCase();
    if (query) {
      list = list.filter(
        (task) =>
          task.description.toLowerCase().includes(query)
          || task.show_name.toLowerCase().includes(query)
          || task.type.toLowerCase().includes(query),
      );
    }
    const status = search.tasks_status;
    if (status) {
      list = list.filter((t) => t.status === status);
    }
    return list;
  }, [taskStats.incomplete_tasks, search.tasks_search, search.tasks_status]);

  const showsData = useMemo(() => {
    if (showStats.total_count === 0)
      return [];
    return [
      {
        id: 'shows-range-summary',
        shows_range: `Shows scheduled within range: ${showStats.total_count} scheduled`,
        actuals_completeness: `${showStats.complete_count} complete, ${showStats.incomplete_count} incomplete`,
        status: showStats.incomplete_count === 0 ? 'ALL COMPLETE' : 'INCOMPLETE',
      },
    ];
  }, [showStats]);

  const filteredShows = useMemo(() => {
    let list = showsData;
    const query = search.shows_search?.toLowerCase();
    if (query) {
      list = list.filter(
        (row) =>
          row.shows_range.toLowerCase().includes(query)
          || row.actuals_completeness.toLowerCase().includes(query),
      );
    }
    const completeness = search.shows_completeness;
    if (completeness) {
      list = list.filter((r) => r.status === completeness);
    }
    return list;
  }, [showsData, search.shows_search, search.shows_completeness]);

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
              {showStats.complete_count}
              {' '}
              <span className="text-sm font-normal text-muted-foreground">
                /
                {showStats.total_count}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Completeness</span>
                <span className="font-semibold text-foreground">
                  {completenessPercentage}
                  %
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${completenessPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {showStats.incomplete_count}
              {' '}
              shows missing actual start/end times
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
              {creatorStats.exceptions.length}
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
              Active platform stream alerts requiring confirmation before sign-off.
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
        <CardHeader className="pb-0 border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">Run Exception Logs</CardTitle>
              <CardDescription>
                Detailed overview of operational alerts and discrepancies.
              </CardDescription>
            </div>

            {/* Custom styled modern tabs */}
            <div className="flex w-full sm:w-auto overflow-x-auto scrollbar-none flex-nowrap items-center gap-1 rounded-lg bg-muted p-1 text-xs scroll-smooth">
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
                  {creatorStats.exceptions.length}
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 min-w-0 w-full overflow-hidden">
          {/* Creators Tab */}
          {activeTab === 'creators' && (
            <div className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <Input
                    placeholder="Search creators, shows, or reasons..."
                    value={search.creators_search ?? ''}
                    onChange={(e) => onSearchChange({ creators_search: e.target.value || undefined })}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.creators_status ?? 'ALL'}
                    onValueChange={(val) =>
                      onSearchChange({ creators_status: val === 'ALL' ? undefined : val })}
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
              </div>

              <DataTable
                data={filteredCreators}
                columns={creatorColumns}
                emptyMessage="No creator lateness exceptions or missing attendance flags recorded for this day range."
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
                    onChange={(e) => onSearchChange({ violations_search: e.target.value || undefined })}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.violations_severity ?? 'ALL'}
                    onValueChange={(val) =>
                      onSearchChange({ violations_severity: val === 'ALL' ? undefined : val })}
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
              </div>

              <DataTable
                data={filteredViolations}
                columns={violationColumns}
                emptyMessage="No active platform stream lag, offline, or configuration violations reported."
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
                    onChange={(e) => onSearchChange({ tasks_search: e.target.value || undefined })}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.tasks_status ?? 'ALL'}
                    onValueChange={(val) =>
                      onSearchChange({ tasks_status: val === 'ALL' ? undefined : val })}
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
              </div>

              <DataTable
                data={filteredTasks}
                columns={taskColumns}
                emptyMessage="Every task, pre-production check, on-air, and post-production template task has been completed!"
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
                    onChange={(e) => onSearchChange({ shows_search: e.target.value || undefined })}
                    className="max-w-md w-full"
                  />
                  <Select
                    value={search.shows_completeness ?? 'ALL'}
                    onValueChange={(val) =>
                      onSearchChange({ shows_completeness: val === 'ALL' ? undefined : val })}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All States</SelectItem>
                      <SelectItem value="ALL COMPLETE">ALL COMPLETE</SelectItem>
                      <SelectItem value="INCOMPLETE">INCOMPLETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DataTable
                data={filteredShows}
                columns={showColumns}
                emptyMessage="No shows scheduled in the selected date range."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
