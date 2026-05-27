import {
  BadgeCheck,
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
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';

type ShowRunSummaryProps = {
  data: ShowRunReviewSummary;
  isFetching?: boolean;
};

type ActiveTab = 'creators' | 'violations' | 'tasks' | 'shows';

export function ShowRunSummary({ data, isFetching = false }: ShowRunSummaryProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('creators');

  const showStats = data.shows;
  const creatorStats = data.creators;
  const platformStats = data.platforms;
  const taskStats = data.tasks;

  const completenessPercentage = showStats.total_count > 0
    ? Math.round((showStats.complete_count / showStats.total_count) * 100)
    : 0;

  return (
    <div className="space-y-6">
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
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active platform stream alerts requiring confirmation before sign-off.
            </p>
            <div className="mt-2.5">
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
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Unfinished pre-production, on-air, or post-production checkpoints.
            </p>
            <div className="mt-2.5">
              <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-purple-200 bg-purple-50 text-purple-700">
                Checklist Gates
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Panel Navigation */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-0 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">Run Exception Logs</CardTitle>
              <CardDescription>
                Detailed overview of operational alerts and discrepancies.
              </CardDescription>
            </div>

            {/* Custom styled modern tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('creators')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
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
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
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
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
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
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
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

        <CardContent className="pt-6">
          {/* Creators Tab */}
          {activeTab === 'creators' && (
            <div className="space-y-4">
              {creatorStats.exceptions.length === 0
                ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 mb-3 border border-emerald-100">
                        <BadgeCheck className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold">All Creators Present & On Time</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        No creator lateness exceptions or missing attendance flags recorded for this day range.
                      </p>
                    </div>
                  )
                : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                            <th className="p-3">Creator Name</th>
                            <th className="p-3">Show Name</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Exception Details</th>
                            <th className="p-3">Operator's Note / Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {creatorStats.exceptions.map((ex) => (
                            <tr key={ex.show_creator_uid} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-medium text-foreground">{ex.creator_name}</td>
                              <td className="p-3">
                                <div className="font-medium text-xs">{ex.show_name}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Start:
                                  {' '}
                                  {new Date(ex.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="p-3">
                                {ex.status === 'MISSING'
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
                                    )}
                              </td>
                              <td className="p-3">
                                {ex.status === 'LATE'
                                  ? (
                                      <span className="text-xs font-semibold text-amber-800">
                                        {ex.late_minutes}
                                        {' '}
                                        minutes late
                                      </span>
                                    )
                                  : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                              </td>
                              <td className="p-3 text-xs italic text-muted-foreground">
                                {ex.reason
                                  ? (
                                      <span className="not-italic text-foreground bg-muted/40 rounded px-2 py-1 border block max-w-xs truncate">
                                        {ex.reason}
                                      </span>
                                    )
                                  : (
                                      'No reason specified'
                                    )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          )}

          {/* Stream Alerts Tab */}
          {activeTab === 'violations' && (
            <div className="space-y-4">
              {platformStats.active_violations_count === 0
                ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 mb-3 border border-emerald-100">
                        <BadgeCheck className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold">Platform Streams Stayed Clean</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        No active platform stream lag, offline, or configuration violations reported.
                      </p>
                    </div>
                  )
                : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                            <th className="p-3">Platform</th>
                            <th className="p-3">Show Name</th>
                            <th className="p-3">Violation Type</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3">Reason / Details</th>
                            <th className="p-3">Observed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {platformStats.violations.map((violation) => (
                            <tr key={violation.violation_uid} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-semibold text-foreground">{violation.platform_name}</td>
                              <td className="p-3">
                                <div className="font-medium text-xs">{violation.show_name}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Start:
                                  {' '}
                                  {new Date(violation.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="p-3 font-medium text-xs text-rose-700">{violation.violation_type}</td>
                              <td className="p-3">
                                {violation.severity === 'CRITICAL' && (
                                  <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                                    CRITICAL
                                  </span>
                                )}
                                {violation.severity === 'HIGH' && (
                                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                                    HIGH
                                  </span>
                                )}
                                {violation.severity === 'MEDIUM' && (
                                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                                    MEDIUM
                                  </span>
                                )}
                                {violation.severity === 'LOW' && (
                                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                                    LOW
                                  </span>
                                )}
                                {violation.severity === 'WARNING' && (
                                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 border border-yellow-200">
                                    WARNING
                                  </span>
                                )}
                                {!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING'].includes(violation.severity) && (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
                                    {violation.severity}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs">{violation.reason}</td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {new Date(violation.observed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          )}

          {/* Incomplete Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {taskStats.incomplete_phase_checks_count === 0
                ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 mb-3 border border-emerald-100">
                        <BadgeCheck className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold">All Phase Checklist Gates Passed</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        Every task, pre-production check, on-air, and post-production template task has been completed!
                      </p>
                    </div>
                  )
                : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                            <th className="p-3">Task Description</th>
                            <th className="p-3">Phase / Type</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Associated Show</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {taskStats.incomplete_tasks.map((task) => (
                            <tr key={task.task_uid} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-medium text-foreground">{task.description}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-[10px] font-medium border-purple-200 bg-purple-50 text-purple-700 uppercase">
                                  {task.type.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border">
                                  {task.status}
                                </span>
                              </td>
                              <td className="p-3 text-xs font-semibold text-indigo-700">{task.show_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          )}

          {/* Shows Range Tab */}
          {activeTab === 'shows' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                      <th className="p-3">Show Name</th>
                      <th className="p-3">Time Window</th>
                      <th className="p-3">Actual Run Times</th>
                      <th className="p-3 text-center">Completeness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.shows.total_count === 0
                      ? (
                          <tr>
                            <td colSpan={4} className="p-10 text-center text-muted-foreground text-sm">
                              No shows scheduled in the selected date range.
                            </td>
                          </tr>
                        )
                      : (
                          /* Since the API returns aggregated numbers, we can display this friendly operational check review */
                          <tr className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-semibold" colSpan={3}>
                              Shows scheduled within selected range:
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant={showStats.incomplete_count === 0 ? 'outline' : 'destructive'}
                                className={showStats.incomplete_count === 0 ? 'border-green-200 bg-green-50 text-green-700 font-normal' : ''}
                              >
                                {showStats.incomplete_count === 0 ? 'ALL COMPLETE' : `${showStats.incomplete_count} MISSING ACTUALS`}
                              </Badge>
                            </td>
                          </tr>
                        )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
