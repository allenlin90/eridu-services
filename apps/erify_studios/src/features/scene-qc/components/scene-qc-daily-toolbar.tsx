import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { Button } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type SceneQcDailyToolbarProps = {
  date: string;
  isCurrentDay: boolean;
  isRefreshing: boolean;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onRefresh: () => void;
};

/** §7.2 (1): operational-date navigation. Page title/description/Manage Scene Profiles live in the route's PageLayout. */
export function SceneQcDailyToolbar({
  date,
  isCurrentDay,
  isRefreshing,
  onPreviousDay,
  onNextDay,
  onToday,
  onRefresh,
}: SceneQcDailyToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="icon" onClick={onPreviousDay} aria-label="Previous operational day">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium">{date}</span>
      <Button type="button" variant="outline" size="icon" onClick={onNextDay} aria-label="Next operational day">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onToday} disabled={isCurrentDay}>
        Today
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh"
        className="ml-auto"
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
    </div>
  );
}
