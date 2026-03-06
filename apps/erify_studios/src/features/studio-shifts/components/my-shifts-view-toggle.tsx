import { Button } from '@eridu/ui';

type MyShiftsViewToggleProps = {
  viewMode: 'calendar' | 'table';
  onViewModeChange: (mode: 'calendar' | 'table') => void;
};

export function MyShiftsViewToggle({
  viewMode,
  onViewModeChange,
}: MyShiftsViewToggleProps) {
  return (
    <div className="inline-flex w-full max-w-xs items-center rounded-md border bg-background p-1 shadow-sm sm:w-auto">
      <Button
        size="sm"
        className="h-8 flex-1 px-4 sm:w-24 sm:flex-none"
        variant={viewMode === 'calendar' ? 'default' : 'ghost'}
        onClick={() => onViewModeChange('calendar')}
      >
        Calendar
      </Button>
      <Button
        size="sm"
        className="h-8 flex-1 px-4 sm:w-24 sm:flex-none"
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        onClick={() => onViewModeChange('table')}
      >
        Table
      </Button>
    </div>
  );
}
