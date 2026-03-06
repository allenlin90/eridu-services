import { Button, Card, CardContent } from '@eridu/ui';

type DashboardDateNavigationCardProps = {
  operationalDateLabel: string;
  operationalDayEndHour: number;
  isTodaySelected: boolean;
  onPreviousDay: () => void;
  onToday: () => void;
  onNextDay: () => void;
};

export function DashboardDateNavigationCard({
  operationalDateLabel,
  operationalDayEndHour,
  isTodaySelected,
  onPreviousDay,
  onToday,
  onNextDay,
}: DashboardDateNavigationCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Operational day:
            {' '}
            {operationalDateLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            Window: 00:00 to
            {' '}
            {operationalDayEndHour - 1}
            :59 next day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onPreviousDay}>
            Previous Day
          </Button>
          <Button size="sm" variant="outline" disabled={isTodaySelected} onClick={onToday}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={onNextDay}>
            Next Day
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
