import { CalendarDays, ListTodo, MonitorX, Users2 } from 'lucide-react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

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

type ShowRunMetricCardsProps = {
  data: ShowRunReviewSummary;
};

/**
 * Top-of-surface key-metric cards for Show Run Review: show actuals
 * completeness, creator exceptions, stream violations, and incomplete phase
 * checks. Pure presentation derived from the summary payload.
 */
export function ShowRunMetricCards({ data }: ShowRunMetricCardsProps) {
  const showStats = data.shows;
  const creatorStats = data.creators;
  const platformStats = data.platforms;
  const taskStats = data.tasks;

  const startedPercentage = showStats.total_count > 0
    ? Math.round((showStats.started_count / showStats.total_count) * 100)
    : 0;

  return (
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
  );
}
