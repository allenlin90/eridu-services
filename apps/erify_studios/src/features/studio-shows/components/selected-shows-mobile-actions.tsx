import { ListTodo, MoreHorizontal, UserRound } from 'lucide-react';

import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@eridu/ui';

type SelectedShowsMobileActionsProps = {
  selectedCount: number;
  onGenerate: () => void;
  onAssign: () => void;
  onClear: () => void;
};

export function SelectedShowsMobileActions({
  selectedCount,
  onGenerate,
  onAssign,
  onClear,
}: SelectedShowsMobileActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {selectedCount}
          {' '}
          selected
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClear}>
            Cancel
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Selected Shows</SheetTitle>
                <SheetDescription>
                  Run actions for
                  {' '}
                  {selectedCount}
                  {' '}
                  selected shows.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 p-4 pt-0">
                <SheetClose asChild>
                  <Button
                    className="h-11 justify-start"
                    onClick={onGenerate}
                  >
                    <ListTodo className="mr-2 h-4 w-4" />
                    Generate Tasks
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    className="h-11 justify-start"
                    variant="secondary"
                    onClick={onAssign}
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    Assign Tasks
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
