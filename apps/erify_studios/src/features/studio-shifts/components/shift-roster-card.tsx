import { ShieldCheck, Trash2, UserCheck } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';

type MemberInfo = { name: string; email: string };

type ShiftRosterCardProps = {
  shifts: StudioShift[];
  isLoading: boolean;
  isFetching: boolean;
  canManageShifts: boolean;
  memberMap: Map<string, MemberInfo>;
  deleteConfirmShiftId: string | null;
  isMutating: boolean;
  formatDate: (value: string) => string;
  formatDateTime: (value: string) => string;
  getShiftWindowLabel: (shift: StudioShift) => string;
  onToggleDutyManager: (shiftId: string, nextDutyManager: boolean) => void;
  onEdit: (shift: StudioShift) => void;
  onDelete: (shiftId: string) => void;
};

export function ShiftRosterCard({
  shifts,
  isLoading,
  isFetching,
  canManageShifts,
  memberMap,
  deleteConfirmShiftId,
  isMutating,
  formatDate,
  formatDateTime,
  getShiftWindowLabel,
  onToggleDutyManager,
  onEdit,
  onDelete,
}: ShiftRosterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Roster</CardTitle>
        <CardDescription>
          Quick list of scheduled shifts and duty manager assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(isLoading || isFetching)
          ? (
              <p className="text-sm text-muted-foreground">Loading shifts...</p>
            )
          : shifts.length === 0
            ? (
                <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
              )
            : shifts.map((shift) => {
                const user = memberMap.get(shift.user_id);

                return (
                  <div
                    key={shift.id}
                    className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{user?.name ?? shift.user_id}</p>
                          <Badge variant="outline">{shift.status}</Badge>
                          {shift.is_duty_manager && (
                            <Badge>
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Duty Manager
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user?.email ?? 'Member details unavailable'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(shift.date)}
                          {' '}
                          |
                          {' '}
                          {getShiftWindowLabel(shift)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last updated:
                          {' '}
                          {formatDateTime(shift.updated_at)}
                        </p>
                      </div>

                      {canManageShifts && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={shift.is_duty_manager ? 'outline' : 'default'}
                            onClick={() => onToggleDutyManager(shift.id, !shift.is_duty_manager)}
                            disabled={isMutating}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            {shift.is_duty_manager ? 'Unset Duty Manager' : 'Set Duty Manager'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(shift)}
                            disabled={isMutating}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDelete(shift.id)}
                            disabled={isMutating}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteConfirmShiftId === shift.id ? 'Confirm Delete' : 'Delete'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
      </CardContent>
    </Card>
  );
}
