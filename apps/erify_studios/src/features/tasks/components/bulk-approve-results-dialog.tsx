import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';

import type { BulkApproveTasksResponse } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

type BulkApproveResultsDialogProps = {
  results: BulkApproveTasksResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BulkApproveResultsDialog({
  results,
  open,
  onOpenChange,
}: BulkApproveResultsDialogProps) {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  if (!results) {
    return null;
  }

  const { summary, results: taskResults } = results;

  const toggleTaskExpanded = (taskUid: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskUid]: !prev[taskUid],
    }));
  };

  const getOutcomeBadgeVariant = (outcome: string) => {
    switch (outcome) {
      case 'written':
        return 'default';
      case 'skipped_lower_priority':
      case 'skipped_collision':
        return 'secondary';
      case 'skipped_stale_target':
      case 'noop':
      default:
        return 'outline';
    }
  };

  const getOutcomeBadgeClass = (outcome: string) => {
    switch (outcome) {
      case 'written':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'skipped_lower_priority':
        return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'skipped_collision':
        return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      case 'skipped_stale_target':
      case 'noop':
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const formatFactKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="space-y-1.5 flex-shrink-0">
          <DialogTitle className="text-xl font-bold tracking-tight">Bulk Approval Summary</DialogTitle>
          <DialogDescription>
            Detailed execution outcomes of the submitted tasks bulk approval and fact extraction pipeline.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary Panel */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-muted/50 my-4 flex-shrink-0">
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Processed</span>
            <span className="text-2xl font-bold mt-1 text-foreground">{summary.total_processed}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 text-center border-x border-muted/50">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Approved</span>
            <span className="text-2xl font-bold mt-1 text-emerald-500">{summary.total_success}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium uppercase tracking-wider">Failed</span>
            <span className="text-2xl font-bold mt-1 text-rose-500">{summary.total_failed}</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin">
          {taskResults.map((result) => {
            const isSuccess = result.status === 'success';
            const isExpanded = !!expandedTasks[result.task_uid];
            const entriesCount = result.extraction?.entries?.length || 0;

            return (
              <div
                key={result.task_uid}
                className={`rounded-lg border p-4 transition-all duration-200 ${
                  isSuccess
                    ? 'border-muted/50 bg-card hover:bg-muted/10'
                    : 'border-rose-200 bg-rose-50/10 dark:border-rose-900/30 dark:bg-rose-950/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2.5 items-start min-w-0">
                    {isSuccess
                      ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        )
                      : (
                          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        Task UID:
                        {' '}
                        <span className="font-mono text-xs">{result.task_uid}</span>
                      </p>
                      {isSuccess
                        ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Approved successfully •
                              {' '}
                              {entriesCount}
                              {' '}
                              extraction
                              {' '}
                              {entriesCount === 1 ? 'entry' : 'entries'}
                              {' '}
                              generated
                            </p>
                          )
                        : (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                              Approval Failed
                            </p>
                          )}
                    </div>
                  </div>

                  {isSuccess && entriesCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md"
                      onClick={() => toggleTaskExpanded(result.task_uid)}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                </div>

                {/* Error Callout */}
                {!isSuccess && result.error && (
                  <div className="mt-3 text-xs bg-rose-500/10 border border-rose-200/50 text-rose-600 dark:text-rose-400 dark:border-rose-900/40 p-2.5 rounded-md flex gap-2">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{result.error}</span>
                  </div>
                )}

                {/* Extraction Entries Breakdown */}
                {isSuccess && isExpanded && entriesCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-muted/50 space-y-2.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Ingestion Outcomes
                    </p>
                    <div className="space-y-2 pl-2">
                      {result.extraction?.entries.map((entry) => (
                        <div
                          key={`${entry.fact_key}:${entry.target_uid}:${entry.source_field_id}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 bg-muted/20 dark:bg-muted/5 rounded border border-muted/30"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-semibold text-foreground">
                              {formatFactKey(entry.fact_key)}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              Field:
                              {' '}
                              {entry.source_field_id}
                              {' '}
                              • Target:
                              {' '}
                              <span className="font-mono">{entry.target_uid}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge
                              variant={getOutcomeBadgeVariant(entry.outcome)}
                              className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${getOutcomeBadgeClass(entry.outcome)}`}
                            >
                              {entry.outcome.replace('skipped_', '')}
                            </Badge>
                            {entry.reason && entry.reason !== 'value_absent' && (
                              <span className="text-[10px] text-muted-foreground italic">
                                (
                                {entry.reason.replace(/_/g, ' ')}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t border-muted/50 mt-4">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto font-medium">
            Dismiss Summary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
