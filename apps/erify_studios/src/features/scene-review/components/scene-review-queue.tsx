import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

import type { SceneReviewListItem, SceneReviewMode } from '@eridu/api-types/task-management';
import { Badge, Button, Skeleton } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import * as m from '@/paraglide/messages';

type SceneReviewQueueProps = {
  items: SceneReviewListItem[];
  mode: SceneReviewMode;
  selectedTaskId?: string;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  onSelect: (taskId: string) => void;
  onPageChange: (page: number) => void;
};

export function SceneReviewQueue({
  items,
  mode,
  selectedTaskId,
  page,
  totalPages,
  isLoading,
  isError,
  onSelect,
  onPageChange,
}: SceneReviewQueueProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-destructive">
        {m.scene_review_queue_error()}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 p-6 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{m.scene_review_empty_title()}</p>
        <p className="text-sm text-muted-foreground">{m.scene_review_empty_description()}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => (
          <button
            key={item.task_id}
            type="button"
            aria-current={selectedTaskId === item.task_id ? 'true' : undefined}
            onClick={() => onSelect(item.task_id)}
            className={cn(
              'flex w-full gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedTaskId === item.task_id && 'border-primary bg-primary/5',
            )}
          >
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
              <img src={item.preview.url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="truncate text-sm font-semibold">{item.show.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.platforms.map((platform) => platform.name).join(', ') || m.scene_review_no_platform()}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{item.task_type}</Badge>
                {mode === 'qc-inbox' ? <Badge>{item.status}</Badge> : null}
                <span className="text-[11px] text-muted-foreground">
                  {m.scene_review_evidence_count({ count: item.evidence_count })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t p-2">
        <span className="text-xs text-muted-foreground">
          {m.scene_review_page_count({ page, total: Math.max(totalPages, 1) })}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={m.scene_review_previous_page()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={m.scene_review_next_page()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
