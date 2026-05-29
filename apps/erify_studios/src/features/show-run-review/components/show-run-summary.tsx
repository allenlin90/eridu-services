import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
  MonitorX,
  ShieldAlert,
  Users2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';
import { useSignOffShowRunReview } from '@/features/shows/api/sign-off-show-run-review';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

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

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} ${d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function ShowRunSummary({ data, isFetching = false, search, onSearchChange, studioId }: ShowRunSummaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { role } = useStudioAccess(studioId);
  const isManagerOrAdmin = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;

  const { mutate: signOff, isPending } = useSignOffShowRunReview(studioId);

  const handleSignOff = () => {
    signOff(
      {
        studioId,
        data: {
          date_from: data.date_from,
          date_to: data.date_to,
          reason: reason.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Operational range signed off successfully');
          setIsDialogOpen(false);
          setReason('');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message ?? 'Failed to sign off range');
        },
      },
    );
  };
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

  const startedPercentage = showStats.total_count > 0
    ? Math.round((showStats.started_count / showStats.total_count) * 100)
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
        actuals_completeness: `${showStats.started_count} started, ${showStats.not_started_count} not started · ${showStats.late_start_count} late (${formatDurationMinutes(showStats.missing_duration_minutes)} lost)`,
        status: showStats.not_started_count === 0 ? 'ALL STARTED' : 'MISSING STARTS',
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

      {/* Sign-Off Range Banner */}
      {data.sign_off
        ? (
            <Card className="relative overflow-hidden border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm transition-all dark:border-emerald-950 dark:bg-emerald-950/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start justify-between">
                <div className="flex gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Operational Range Signed Off
                    </h3>
                    <p className="text-xs text-emerald-700/95 dark:text-emerald-400/90">
                      Signed off by
                      {' '}
                      <span className="font-semibold">{data.sign_off.actor_name ?? 'Unknown Manager'}</span>
                      {' '}
                      on
                      {' '}
                      {formatDate(data.sign_off.signed_at)}
                    </p>
                    {data.sign_off.reason && (
                      <div className="mt-2 text-xs border-l-2 border-emerald-300 pl-2 italic text-emerald-800 dark:text-emerald-300">
                        &ldquo;
                        {data.sign_off.reason}
                        &rdquo;
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 self-end sm:self-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-emerald-100/50 rounded-lg p-3 text-xs text-zinc-700 dark:text-zinc-300 min-w-[200px]">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-400 border-b pb-1 mb-1">
                    Exception Snapshot
                  </div>
                  <div className="flex justify-between">
                    <span>Late Creators:</span>
                    <span className="font-mono font-semibold">{data.sign_off.unresolved_exceptions.late_creators}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missing Creators:</span>
                    <span className="font-mono font-semibold">{data.sign_off.unresolved_exceptions.missing_creators}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stream Violations:</span>
                    <span className="font-mono font-semibold">{data.sign_off.unresolved_exceptions.platform_violations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incomplete Tasks:</span>
                    <span className="font-mono font-semibold">{data.sign_off.unresolved_exceptions.incomplete_tasks}</span>
                  </div>
                </div>
              </div>
            </Card>
          )
        : (
            <Card className="relative overflow-hidden border border-amber-200 bg-amber-50/20 p-5 shadow-sm dark:border-amber-950 dark:bg-amber-950/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                <div className="flex gap-3">
                  <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Sign-Off Pending
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400/90">
                      This operational date range has not been signed off yet. Review exceptions before sign-off.
                    </p>
                  </div>
                </div>

                <div>
                  {isManagerOrAdmin
                    ? (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all px-4 py-2 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              Sign Off Range
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-bold">Sign Off Operational Range</DialogTitle>
                              <DialogDescription className="text-xs text-muted-foreground">
                                Confirm operational sign-off for the range:
                                {' '}
                                <span className="font-semibold text-foreground">{formatDate(data.date_from).split(' ')[0]}</span>
                                {' '}
                                to
                                {' '}
                                <span className="font-semibold text-foreground">{formatDate(data.date_to).split(' ')[0]}</span>
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-3">
                              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border p-4 space-y-2">
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unresolved Exception Counts</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-zinc-500">Late Creators:</span>
                                    <span className={`font-mono font-semibold ${creatorStats.exceptions.length > 0 ? 'text-amber-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{creatorStats.exceptions.length}</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-zinc-500">Missing Attendance:</span>
                                    <span className={`font-mono font-semibold ${creatorStats.missing_count > 0 ? 'text-rose-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{creatorStats.missing_count}</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-zinc-500">Stream Violations:</span>
                                    <span className={`font-mono font-semibold ${platformStats.active_violations_count > 0 ? 'text-rose-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{platformStats.active_violations_count}</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                    <span className="text-zinc-500">Incomplete Tasks:</span>
                                    <span className={`font-mono font-semibold ${taskStats.incomplete_phase_checks_count > 0 ? 'text-purple-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{taskStats.incomplete_phase_checks_count}</span>
                                  </div>
                                </div>
                              </div>

                              {(creatorStats.exceptions.length > 0 || creatorStats.missing_count > 0 || platformStats.active_violations_count > 0 || taskStats.incomplete_phase_checks_count > 0) && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 flex gap-2">
                                  <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold">Unresolved exceptions exist.</span>
                                    {' '}
                                    Signing off will record and acknowledge these exceptions in the immutable range audit log.
                                  </div>
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <label htmlFor="reason" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                  Acknowledgment Reason / Operator Note
                                </label>
                                <Textarea
                                  id="reason"
                                  placeholder="Provide details about exceptions or acknowledgment notes..."
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  className="min-h-[80px]"
                                />
                              </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleSignOff}
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                {isPending
                                  ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing Off...
                                      </>
                                    )
                                  : (
                                      'Confirm & Sign Off'
                                    )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )
                    : (
                        <span className="text-xs text-amber-700/80 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md font-medium border border-amber-200/50">
                          Awaiting Manager Sign-Off
                        </span>
                      )}
                </div>
              </div>
            </Card>
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
                      <SelectItem value="ALL STARTED">ALL STARTED</SelectItem>
                      <SelectItem value="MISSING STARTS">MISSING STARTS</SelectItem>
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
