import { format } from 'date-fns';
import { AlertTriangle, ChevronDown, ChevronUp, CircleCheckBig, ListChecks, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Skeleton,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import {
  buildShowReadinessViewModel,
  getWarningIssueTags,
  type ReadinessBucket,
  type TaskReadinessWarning,
} from '@/features/studio-shows/utils/show-readiness.utils';

type ShowReadinessTriagePanelProps = {
  scopeLabel: string;
  showsInScopeCount: number;
  taskReadinessWarnings: TaskReadinessWarning[];
  isLoading: boolean;
  isFetching: boolean;
  isVisible: boolean;
  hasIncompletePlanningRange: boolean;
  hasInvalidPlanningRange: boolean;
  needsAttentionActive: boolean;
  onRefresh: () => void;
  onToggleVisibility: () => void;
  onActivateIssuesFilter: () => void;
};

const READINESS_BUCKET_PREVIEW_LIMIT = 6;
// Keep this intentionally high so mobile stacked cards are not clipped while preserving collapse animation.
const EXPANDED_READINESS_MAX_HEIGHT_CLASS = 'max-h-[160rem]';

function formatShowDateTime(startTime?: string): string {
  if (!startTime) {
    return 'Time unavailable';
  }

  const parsed = new Date(startTime);
  if (Number.isNaN(parsed.getTime())) {
    return 'Time unavailable';
  }

  return format(parsed, 'MMM d, p');
}

function getBucketTone(bucket: ReadinessBucket): {
  border: string;
  badge: string;
  toneLabel: string;
} {
  if (bucket.count <= 0) {
    return {
      border: 'border-slate-200',
      badge: 'border-slate-200 bg-slate-50 text-slate-600',
      toneLabel: 'Clear',
    };
  }

  if (bucket.key === 'no_task_plan') {
    return {
      border: 'border-red-200',
      badge: 'border-red-200 bg-red-50 text-red-700',
      toneLabel: 'High',
    };
  }

  if (bucket.key === 'unassigned_workload') {
    return {
      border: 'border-amber-200',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      toneLabel: 'Medium',
    };
  }

  return {
    border: 'border-blue-200',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    toneLabel: 'Medium',
  };
}

function BucketInspectPopover({ bucket }: { bucket: ReadinessBucket }) {
  const previewItems = bucket.warnings.slice(0, READINESS_BUCKET_PREVIEW_LIMIT);
  const overflowCount = Math.max(bucket.warnings.length - previewItems.length, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={bucket.warnings.length === 0}
          aria-label={`Inspect ${bucket.title} shows`}
        >
          Inspect
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,340px)] p-0" align="end">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">{bucket.title}</p>
          <p className="text-xs text-muted-foreground">
            {bucket.warnings.length}
            {' '}
            affected shows
          </p>
        </div>
        <div className="max-h-72 space-y-3 overflow-auto p-3">
          {previewItems.length === 0
            ? (
                <p className="text-xs text-muted-foreground">No affected shows in this bucket.</p>
              )
            : (
                previewItems.map((warning) => {
                  const issueTags = getWarningIssueTags(warning);
                  const hasMultiIssue = issueTags.length > 1;

                  return (
                    <div key={warning.show_id} className="rounded-md border p-2">
                      <p className="text-sm font-medium leading-tight">{warning.show_name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatShowDateTime(warning.show_start)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issueTags.map((tag) => (
                          <Badge
                            key={`${warning.show_id}-${tag}`}
                            variant="outline"
                            className={cn(
                              'text-[10px] font-normal',
                              hasMultiIssue ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200',
                            )}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
          {overflowCount > 0 && (
            <p className="text-xs text-muted-foreground">
              +
              {overflowCount}
              {' '}
              more shows
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ShowReadinessTriagePanel({
  scopeLabel,
  showsInScopeCount,
  taskReadinessWarnings,
  isLoading,
  isFetching,
  isVisible,
  hasIncompletePlanningRange,
  hasInvalidPlanningRange,
  needsAttentionActive,
  onRefresh,
  onToggleVisibility,
  onActivateIssuesFilter,
}: ShowReadinessTriagePanelProps) {
  const viewModel = useMemo(
    () => buildShowReadinessViewModel(taskReadinessWarnings, showsInScopeCount),
    [taskReadinessWarnings, showsInScopeCount],
  );
  const shouldShowSkeleton = isLoading || isFetching;
  const isIssuesCtaDisabled = hasIncompletePlanningRange || hasInvalidPlanningRange || showsInScopeCount <= 0;

  return (
    <Card>
      <CardHeader className="relative gap-3 pr-24">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={!isVisible || isFetching || hasIncompletePlanningRange || hasInvalidPlanningRange}
            aria-label="Refresh task readiness warnings"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleVisibility}
            aria-label={isVisible ? 'Hide readiness snapshot' : 'Show readiness snapshot'}
          >
            {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Readiness Triage
          </CardTitle>
          <CardDescription>
            Readiness for selected scope (
            {scopeLabel}
            ).
          </CardDescription>
        </div>
        {hasIncompletePlanningRange && (
          <p className="text-sm text-muted-foreground">Select a date range to load readiness triage.</p>
        )}
        {hasInvalidPlanningRange && (
          <p className="text-sm text-destructive">Scope end date must be on or after start date.</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isVisible ? `${EXPANDED_READINESS_MAX_HEIGHT_CLASS} opacity-100` : 'max-h-0 opacity-0 pointer-events-none',
          )}
          aria-hidden={!isVisible}
        >
          {shouldShowSkeleton
            ? (
                <div className="space-y-3">
                  <div className="rounded-md border p-4 space-y-3">
                    <Skeleton className="h-5 w-52" />
                    <Skeleton className="h-4 w-full max-w-[480px]" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((slot) => (
                      <div key={slot} className="rounded-md border p-4 space-y-3">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            : (
                <div className="space-y-3">
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">
                          {viewModel.showsNeedingAttentionCount}
                          {' of '}
                          {viewModel.showsInScopeCount}
                          {' '}
                          shows need attention
                        </p>
                        <p className="text-sm text-muted-foreground">{viewModel.supportText}</p>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-medium w-fit',
                            viewModel.primaryAction === 'no_task_plan' && 'border-red-200 bg-red-50 text-red-700',
                            viewModel.primaryAction === 'unassigned_workload' && 'border-amber-200 bg-amber-50 text-amber-700',
                            viewModel.primaryAction === 'missing_required_coverage' && 'border-blue-200 bg-blue-50 text-blue-700',
                            !viewModel.primaryAction && 'border-green-200 bg-green-50 text-green-700',
                          )}
                        >
                          {viewModel.primaryAction === 'no_task_plan' && 'Priority: No task plan'}
                          {viewModel.primaryAction === 'unassigned_workload' && 'Priority: Unassigned workload'}
                          {viewModel.primaryAction === 'missing_required_coverage' && 'Priority: Missing coverage'}
                          {!viewModel.primaryAction && 'All clear'}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant={needsAttentionActive ? 'secondary' : 'default'}
                          className="w-full sm:w-auto"
                          onClick={onActivateIssuesFilter}
                          disabled={isIssuesCtaDisabled}
                          aria-label={needsAttentionActive
                            ? 'Issues filter is active'
                            : 'Activate issues filter in show list'}
                        >
                          <ListChecks className="h-4 w-4 mr-1" />
                          {needsAttentionActive ? 'Issues Filter Active' : 'Open Issues List'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Scope readiness</span>
                        <span className="font-medium text-foreground">
                          {viewModel.readyPercent}
                          % ready
                        </span>
                      </div>
                      <Progress value={viewModel.readyPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {viewModel.readyShowsCount}
                        {' ready / '}
                        {viewModel.showsInScopeCount}
                        {' in scope'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 md:hidden">
                    {viewModel.buckets.map((bucket) => {
                      const tone = getBucketTone(bucket);
                      const firstStat = bucket.supportingStats[0];
                      return (
                        <div key={`mobile-${bucket.key}`} className={cn('rounded-md border p-3 space-y-2', tone.border)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold leading-tight">{bucket.title}</p>
                              <p className="text-xl font-semibold">{bucket.count}</p>
                            </div>
                            <Badge variant="outline" className={cn('text-[10px] font-semibold', tone.badge)}>
                              {tone.toneLabel}
                            </Badge>
                          </div>
                          {firstStat && <p className="text-xs text-muted-foreground">{firstStat}</p>}
                          <div className="pt-1">
                            <BucketInspectPopover bucket={bucket} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden gap-3 md:grid md:grid-cols-3">
                    {viewModel.buckets.map((bucket) => {
                      const tone = getBucketTone(bucket);
                      return (
                        <div key={bucket.key} className={cn('rounded-md border p-4 flex h-full flex-col gap-3', tone.border)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{bucket.title}</p>
                              <p className="text-xs text-muted-foreground">{bucket.description}</p>
                            </div>
                            <Badge variant="outline" className={cn('text-[10px] font-semibold', tone.badge)}>
                              {tone.toneLabel}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-2xl font-semibold">{bucket.count}</p>
                            <p className="text-xs text-muted-foreground">
                              {bucket.key === 'unassigned_workload' ? 'Tasks unassigned' : 'Affected shows'}
                            </p>
                          </div>
                          <div className="space-y-1 min-h-11">
                            {bucket.supportingStats.slice(0, 2).map((stat) => (
                              <p key={`${bucket.key}-${stat}`} className="text-xs text-muted-foreground">
                                {stat}
                              </p>
                            ))}
                          </div>
                          <div className="pt-1 mt-auto">
                            <BucketInspectPopover bucket={bucket} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!hasIncompletePlanningRange && !hasInvalidPlanningRange && showsInScopeCount > 0 && viewModel.showsNeedingAttentionCount === 0 && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                      <CircleCheckBig className="h-4 w-4" />
                      All in-scope shows are ready. Continue monitoring from the list as schedules change.
                    </div>
                  )}
                </div>
              )}
        </div>
      </CardContent>
    </Card>
  );
}
