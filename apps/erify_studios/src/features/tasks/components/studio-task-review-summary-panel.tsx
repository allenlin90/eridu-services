import { Activity, Archive, Clock, Inbox } from 'lucide-react';

import { cn } from '@eridu/ui/lib/utils';

export type TaskReviewActiveFilter =
  | 'all'
  | 'ready'
  | 'attention'
  | 'pre-prod-attention'
  | 'pre-prod-ready'
  | 'pre-prod-done'
  | 'on-air-attention'
  | 'on-air-ready'
  | 'on-air-done'
  | 'post-prod-attention'
  | 'post-prod-ready'
  | 'post-prod-done'
  | 'done';

type StudioTaskReviewSummaryPanelProps = {
  stats: {
    total: number;
    ready: number;
    attention: number;
    done: number;
    preProdAttentionCount: number;
    preProdReadyCount: number;
    preProdDoneCount: number;
    onAirAttentionCount: number;
    onAirReadyCount: number;
    onAirDoneCount: number;
    postProdAttentionCount: number;
    postProdReadyCount: number;
    postProdDoneCount: number;
  };
  activeFilter: TaskReviewActiveFilter;
  setActiveFilter: (filter: TaskReviewActiveFilter) => void;
};

export function StudioTaskReviewSummaryPanel({
  stats,
  activeFilter,
  setActiveFilter,
}: StudioTaskReviewSummaryPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Review Overview */}
      <div
        onClick={() => setActiveFilter('all')}
        className={cn(
          'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
          activeFilter === 'all'
            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/20'
            : 'border-muted/60 dark:border-muted/30',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Review Overview
          </span>
          <Inbox className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{stats.total}</span>
          <span className="text-xs text-muted-foreground">Tasks in Review</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('ready');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500',
            )}
          >
            <span
              className="h-2 w-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0"
              style={{ animationDuration: '3s' }}
            />
            <span>
              {stats.ready}
              {' '}
              Ready
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('attention');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'attention' ? 'text-rose-600 dark:text-rose-400' : 'text-rose-500',
            )}
          >
            <span
              className="h-2 w-2 rounded-full bg-rose-500 animate-ping flex-shrink-0"
              style={{ animationDuration: '2s' }}
            />
            <span>
              {stats.attention}
              {' '}
              Attention
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('done');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'done' ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500',
            )}
          >
            <span
              className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0"
            />
            <span>
              {stats.done}
              {' '}
              Done
            </span>
          </button>
        </div>
      </div>

      {/* Card 2: Pre-Production Exceptions */}
      <div
        onClick={() => setActiveFilter('pre-prod-attention')}
        className={cn(
          'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-blue-500/5 to-cyan-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
          activeFilter === 'pre-prod-attention'
            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/10 dark:bg-blue-950/20'
            : 'border-muted/60 dark:border-muted/30',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Pre-Production (SETUP)
          </span>
          <Clock className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold tracking-tight transition-all duration-200',
              stats.preProdAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '',
            )}
          >
            {stats.preProdAttentionCount}
          </span>
          <span className="text-xs text-muted-foreground">Needs Attention</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('pre-prod-ready');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'pre-prod-ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>
              {stats.preProdReadyCount}
              {' '}
              Ready
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('pre-prod-done');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'pre-prod-done' ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span>
              {stats.preProdDoneCount}
              {' '}
              Done
            </span>
          </button>
        </div>
      </div>

      {/* Card 3: On-Air Exceptions */}
      <div
        onClick={() => setActiveFilter('on-air-attention')}
        className={cn(
          'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-amber-500/5 to-orange-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
          activeFilter === 'on-air-attention'
            ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 dark:bg-amber-950/20'
            : 'border-muted/60 dark:border-muted/30',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            On-Air (ACTIVE/ROUTINE)
          </span>
          <Activity className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold tracking-tight transition-all duration-200',
              stats.onAirAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '',
            )}
          >
            {stats.onAirAttentionCount}
          </span>
          <span className="text-xs text-muted-foreground">Needs Attention</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('on-air-ready');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'on-air-ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>
              {stats.onAirReadyCount}
              {' '}
              Ready
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('on-air-done');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'on-air-done' ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span>
              {stats.onAirDoneCount}
              {' '}
              Done
            </span>
          </button>
        </div>
      </div>

      {/* Card 4: Post-Production Exceptions */}
      <div
        onClick={() => setActiveFilter('post-prod-attention')}
        className={cn(
          'rounded-xl border p-5 shadow-sm bg-gradient-to-br from-rose-500/5 to-pink-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col gap-3',
          activeFilter === 'post-prod-attention'
            ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 dark:bg-rose-950/20'
            : 'border-muted/60 dark:border-muted/30',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Post-Production (CLOSURE)
          </span>
          <Archive className="h-5 w-5 text-rose-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold tracking-tight transition-all duration-200',
              stats.postProdAttentionCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : '',
            )}
          >
            {stats.postProdAttentionCount}
          </span>
          <span className="text-xs text-muted-foreground">Needs Attention</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('post-prod-ready');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'post-prod-ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>
              {stats.postProdReadyCount}
              {' '}
              Ready
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('post-prod-done');
            }}
            className={cn(
              'hover:underline flex items-center gap-1 font-semibold transition-colors duration-150',
              activeFilter === 'post-prod-done' ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span>
              {stats.postProdDoneCount}
              {' '}
              Done
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
