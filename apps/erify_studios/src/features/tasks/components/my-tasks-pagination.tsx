import { Button } from '@eridu/ui';

type MyTasksPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function MyTasksPagination({
  page,
  totalPages,
  total,
  isFetching,
  onPrev,
  onNext,
}: MyTasksPaginationProps) {
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        Page
        {' '}
        {page}
        {' '}
        of
        {' '}
        {totalPages}
        {' '}
        •
        {' '}
        {total}
        {' '}
        task(s)
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!canGoPrev || isFetching}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!canGoNext || isFetching}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
