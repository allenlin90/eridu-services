import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';

type CurrentDutyManagerCardProps = {
  isLoading: boolean;
  dutyManager: StudioShift | null | undefined;
  memberName?: string;
  memberEmail?: string;
  shiftLabel?: string;
  dateLabel?: string;
};

export function CurrentDutyManagerCard({
  isLoading,
  dutyManager,
  memberName,
  memberEmail,
  shiftLabel,
  dateLabel,
}: CurrentDutyManagerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Duty Manager</CardTitle>
        <CardDescription>
          Active duty manager based on the current shift window.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading
          ? (
              <p className="text-sm text-muted-foreground">Loading current duty manager...</p>
            )
          : dutyManager
            ? (
                <div className="space-y-2">
                  <p className="font-medium">{memberName ?? dutyManager.user_id}</p>
                  <p className="text-sm text-muted-foreground">{memberEmail ?? 'Member details unavailable'}</p>
                  <p className="text-sm text-muted-foreground">
                    {dateLabel}
                    {' '}
                    |
                    {' '}
                    {shiftLabel}
                  </p>
                  <Badge className="w-fit">On Duty</Badge>
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">No active duty manager.</p>
              )}
      </CardContent>
    </Card>
  );
}
