import { Button } from '@eridu/ui';

import { type TaskReviewActiveFilter } from './studio-task-review-summary-panel';

type StudioTaskReviewFilterTabsProps = {
  stats: {
    total: number;
    ready: number;
    attention: number;
    done: number;
  };
  activeFilter: TaskReviewActiveFilter;
  onFilterChange: (filter: TaskReviewActiveFilter) => void;
};

export function StudioTaskReviewFilterTabs({
  stats,
  activeFilter,
  onFilterChange,
}: StudioTaskReviewFilterTabsProps) {
  return (
    <div className="flex border-b border-muted py-2 gap-2 overflow-x-auto scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
      <Button
        type="button"
        variant={activeFilter === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onFilterChange('all')}
        className="text-xs font-semibold rounded-md flex-shrink-0"
      >
        All Tasks ({stats.total})
      </Button>
      <Button
        type="button"
        variant={activeFilter === 'ready' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onFilterChange('ready')}
        className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <span>
          Ready for Approval ({stats.ready})
        </span>
      </Button>
      <Button
        type="button"
        variant={
          ['attention', 'pre-prod-attention', 'on-air-attention', 'post-prod-attention'].includes(activeFilter)
            ? 'default'
            : 'ghost'
        }
        size="sm"
        onClick={() => onFilterChange('attention')}
        className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
      >
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
        <span>
          Needs Attention ({stats.attention})
        </span>
      </Button>
      <Button
        type="button"
        variant={activeFilter === 'done' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onFilterChange('done')}
        className="text-xs font-semibold rounded-md flex items-center gap-1.5 flex-shrink-0"
      >
        <span className="h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400 flex-shrink-0" />
        <span>
          Done ({stats.done})
        </span>
      </Button>
    </div>
  );
}
