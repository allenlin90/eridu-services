import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

export type SortRule = { id: string; desc: boolean };

type SortableHeaderProps = {
  columnId: string;
  label: string;
  sortRules: SortRule[];
  onSort: (columnId: string) => void;
};

export function SortableHeader({ columnId, label, sortRules, onSort }: SortableHeaderProps) {
  const ruleIndex = sortRules.findIndex((r) => r.id === columnId);
  const isSorted = ruleIndex !== -1;
  const rule = isSorted ? sortRules[ruleIndex] : null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 font-medium hover:bg-muted/50 text-xs"
      onClick={() => onSort(columnId)}
    >
      <span>{label}</span>
      {isSorted
        ? (
            <div className="flex items-center gap-1">
              {rule?.desc
                ? (
                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  )
                : (
                    <ChevronUp className="h-3.5 w-3.5 text-primary" />
                  )}
              <Badge
                variant="secondary"
                className="h-4 min-w-4 p-0 px-1 text-[10px] flex items-center justify-center font-bold bg-primary/10 text-primary border-none"
              >
                {ruleIndex + 1}
              </Badge>
            </div>
          )
        : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
    </Button>
  );
}
