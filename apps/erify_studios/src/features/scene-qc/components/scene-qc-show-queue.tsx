import type { SceneQcDailyItem } from '@eridu/api-types/scene-qc';
import { Button, Skeleton } from '@eridu/ui';

import { SceneQcQueueRow } from './scene-qc-queue-row';

type SceneQcShowQueueProps = {
  items: SceneQcDailyItem[];
  selectedShowId: string | undefined;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  filtersActive: boolean;
  onSelect: (showId: string) => void;
  onPageChange: (page: number) => void;
};

export function SceneQcShowQueue({
  items,
  selectedShowId,
  page,
  totalPages,
  isLoading,
  isError,
  filtersActive,
  onSelect,
  onPageChange,
}: SceneQcShowQueueProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-destructive">
        Unable to load the Scene QC queue.
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium">
          {filtersActive ? 'No Shows match these filters' : 'No Shows for this operational day'}
        </p>
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? 'Try clearing a filter to see more of the day.'
            : 'There is nothing scheduled to review yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {items.map((item) => (
          <SceneQcQueueRow key={item.show_id} item={item} selected={item.show_id === selectedShowId} onSelect={onSelect} />
        ))}
      </div>
      {totalPages > 1
        ? (
            <div className="flex items-center justify-between border-t p-2">
              <span className="text-xs text-muted-foreground">
                Page
                {' '}
                {page}
                {' '}
                of
                {' '}
                {Math.max(totalPages, 1)}
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                  Prev
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
